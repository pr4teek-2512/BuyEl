# BuyEl - Project Plan

University course marketplace where students list course registrations they hold and sell
them to other students, with anonymous in-app chat, an in-app credit currency, paid listing
boosts, and manually verified UPI QR payments.

Source of truth: `C:\Documents\BuyEl Docs\BuyEl PRD.docx`. Nothing in this plan overrides the
PRD. Every open question is listed in section 9 and must be answered by the product owner
before the affected module is built.

---

## 1. Product summary

| Area | Summary |
|---|---|
| Users | University students in India, phone + OTP only, no email, no password |
| Core loop | Seller lists a course for free, buyer finds it, buyer spends 1 credit to open chat, seller pays once per listing to unlock chat, they transact offline |
| Monetisation | Credit packs (buyers), per listing chat unlock (sellers), listing boost / prioritisation (sellers) |
| Payments | No gateway. Manual UPI QR per price point, user submits UTR, admin accepts or rejects |
| Anonymity | Names and phone numbers are never shown between buyer and seller. Only two letter initials |
| Admin | Separate panel: master lists, QR and plan config, payment verification, employee access, test accounts |
| Theme | White, clean, minimal. Mobile view behaves like a native app (bottom nav bar) |

### Known risk flagged to the owner

Reselling university course seats may conflict with university registration policy in India, and
money changing hands for a seat can be treated as unauthorised trade of an institutional
allocation. This is a product and legal decision, not a technical one. The platform will be built
exactly as specified; the recommendation is to add a terms page and a disclaimer that BuyEl is a
listing and communication service only and does not transfer seats itself. See Q9.1.

---

## 2. Technology stack

Chosen for speed of delivery, one deployable codebase, strong India-specific OTP support, and
real-time chat without running a separate socket server.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | One repo for user site, public landing, admin panel and API routes. Server components keep the listing feed fast |
| Styling | Tailwind CSS v4 + custom component layer | White minimal theme, exact control, no heavy UI kit |
| Icons | lucide-react | Light, consistent |
| Database | PostgreSQL (Supabase managed) | Relational data, strict ordering rules, transactions for credit spend |
| ORM | Prisma | Typed schema, migrations, readable queries |
| Realtime chat | Supabase Realtime (Postgres change streams) | Vercel serverless cannot hold WebSockets. Avoids a second always-on service |
| Auth | Custom phone + OTP, JWT in httpOnly secure cookie, rotating refresh token | PRD requires OTP on every login. No third party auth needed |
| OTP SMS | MSG91 (India, DLT registered templates) behind a provider adapter | Cheapest reliable Indian route. The adapter means Twilio or Fast2SMS can be swapped in one file |
| File storage | Supabase Storage | QR images, payment platform logos, explanatory images |
| Validation | Zod on every API boundary | Shared types between client and server |
| Rate limiting | Upstash Redis (OTP sends, login attempts, chat opens) | Prevents SMS cost abuse |
| Hosting | Vercel (app) + Supabase (DB, storage, realtime) | Matches the existing workflow, zero ops |
| Testing | Vitest (unit: ordering engine, credit ledger), Playwright (end to end) | The sorting and payment rules need regression tests |

Alternative if the owner wants everything self hosted: the same app on a VPS with Docker,
Postgres in a container, and Socket.IO instead of Supabase Realtime. More ops time. See Q9.2.

---

## 3. Architecture

```
                       +---------------------------+
   Public visitor ---> |  Landing page  /          |  (search without login)
                       |  Buy / Chat / Sell  /app  |
   Student       ----> |  Admin panel   /admin     |
                       +------------+--------------+
                                    |  Next.js server actions + route handlers
                                    v
            +-----------------------+------------------------+
            |  Domain services (pure TypeScript, testable)    |
            |  auth  listings  ordering  credits  payments    |
            |  masterlists  chat  notifications  admin        |
            +-----------------------+------------------------+
                                    v
     +--------------+     +-------------------+     +------------------+
     |  PostgreSQL  |     | Supabase Storage  |     |  MSG91 (OTP SMS) |
     |  + Realtime  |     | QR / logos / imgs |     |                  |
     +--------------+     +-------------------+     +------------------+
                                    ^
                              Upstash Redis (rate limits, OTP throttling)
```

### Folder structure

```
buyel/
  prisma/
    schema.prisma
    migrations/
    seed.ts                      # branches master list, plans, payment platforms
  src/
    app/
      (public)/page.tsx          # landing + public search
      (auth)/register, /login
      (app)/buy, /chat, /sell    # authenticated shell with nav bar
      (admin)/admin/...          # admin panel, role gated
      api/...                    # route handlers where a server action is not enough
    components/
      ui/                        # buttons, inputs, modal, sheet, toast
      listing/, chat/, payment/, admin/
    server/
      services/                  # business logic, no React
        auth.service.ts
        listing.service.ts
        ordering.service.ts      # the sorting engine, heavily tested
        credit.service.ts        # ledger, atomic spend
        payment.service.ts
        masterlist.service.ts
        chat.service.ts
        notification.service.ts
      repositories/              # prisma access
      sms/                       # provider adapter (msg91, mock)
    lib/                         # jwt, zod schemas, formatting, initials, abbreviations
    types/
  tests/
    unit/  e2e/
```

### Security baseline

- JWT access token (15 min) plus refresh token (30 days), httpOnly, secure, sameSite lax.
- OTP: 6 digits, hashed in the database, 5 minute expiry, max 5 verify attempts, max 3 sends per
  number per hour and 10 per day, 60 second resend cooldown.
- Admin panel on its own route group with a separate session cookie, per page permissions, and a
  full audit log of every accept, reject and edit.
- Every credit spend and payment grant runs inside a database transaction with an idempotency key.
- Transaction IDs (UTR) are unique across payment requests, which blocks replaying one payment.
- Zod validation on every input, Prisma parameterised queries, CSRF token on mutations, strict
  security headers, and no personal data in any API response the other party can read.

---

## 4. Database schema

PostgreSQL. All ids are `cuid`. Every table carries `created_at` and `updated_at`.

### Identity and access

| Table | Key fields | Notes |
|---|---|---|
| `users` | `phone` (unique, E.164), `name`, `last_name`, `graduation_year`, `college_id?`, `college_text`, `branch_id?`, `branch_text`, `credit_balance`, `is_test_account`, `status` | `*_id` is set when the value matches a master list entry, `*_text` always holds what the user sees. This pairing is what makes section 16 work |
| `otp_codes` | `phone`, `code_hash`, `purpose`, `expires_at`, `attempts`, `consumed_at` | |
| `sessions` | `user_id`, `refresh_token_hash`, `user_agent`, `expires_at`, `revoked_at` | |
| `admin_users` | `username` (unique), `password_hash`, `role` (`owner` or `employee`), `is_active` | Owner seeded as `prateekchauhan` |
| `admin_permissions` | `admin_user_id`, `page_key`, `can_view`, `can_edit` | Drives the "3 pages" column on the User Access screen |
| `test_accounts` | `phone`, `fixed_otp`, `can_access_paid_services`, `test_mode_on`, `redo_onboarding`, `mock_profile_json` | No SMS is ever sent for these numbers |
| `admin_audit_log` | `admin_user_id`, `action`, `entity`, `entity_id`, `before_json`, `after_json` | |

### Master lists (PRD section 16)

| Table | Key fields | Notes |
|---|---|---|
| `colleges` | `name`, `abbreviation`, `normalized_name` (unique) | Starts empty per the PRD. The abbreviation is searchable and is what the listing card shows |
| `branches` | `name`, `level` (`UG` or `PG`), `normalized_name` | Seeded with the Indian UG and PG branch list |
| `courses` | `name`, `normalized_name`, `college_id?` | Starts empty, grows from user submissions |
| `master_list_requests` | `list_type` (`college`, `branch`, `course`), `submitted_text`, `submitted_by_user_id`, `status` (`pending`, `added`, `ignored`, `modified_user_only`), `resolved_text`, `resolved_by_admin_id` | The three admin actions in 16.3 map onto these statuses |

Matching rule: normalise the typed text (lowercase, trim, collapse whitespace). If it equals an
existing `normalized_name`, link the existing row and create no request. Otherwise store the raw
text on the user or listing and create a pending request. The value is usable immediately.

### Listings and ordering

| Table | Key fields | Notes |
|---|---|---|
| `listings` | `seller_id`, `course_id?`, `course_text` (immutable), `college_id?`, `college_text` (immutable), `price`, `status` (`active`, `closed`, `deleted`), `chat_unlocked_at`, `is_boosted`, `boost_expires_at`, `distinct_buyer_chat_count`, `normal_order_key`, `boost_order_key`, `pushed_to_bottom_normal`, `pushed_to_bottom_boost` | Price is editable. Course and college names are write once |
| `listing_boosts` | `listing_id`, `plan_id`, `payment_request_id`, `starts_at`, `ends_at` | Re-boosting an active boost extends from the current `boost_expires_at`. See Q9.6 |

**Ordering engine** (PRD section 4), implemented in `ordering.service.ts` and unit tested:

1. The boosted bucket always sits above the normal bucket, where boosted means
   `is_boosted = true AND boost_expires_at > now()`.
2. Inside the boosted bucket, order by `boost_order_key` descending, so the newest boost is first.
3. Inside the normal bucket, order by `normal_order_key` ascending, so the oldest sits at the top
   and a brand new listing lands at the very bottom.
4. A new listing sets `normal_order_key = now()`.
5. A new boost sets `boost_order_key = now()`.
6. When a normal listing reaches 3 distinct buyer chats it is pushed to the bottom of the normal
   bucket by setting `normal_order_key = now()`, with `pushed_to_bottom_normal` so it happens once.
7. When a boosted listing reaches 4 distinct buyer chats it is pushed to the bottom of the boosted
   bucket by setting `boost_order_key` just below the current minimum of that bucket, flagged once.
8. A listing never changes bucket because of chats. Only a boost purchase or boost expiry moves it.
9. Boost expiry is evaluated at read time, so no cron is required, with a nightly sweep for hygiene.
10. The rank shown to the seller on the Sell page is this same ordering filtered to that listing's
    own college.

The public landing search and the logged in Buy page call the identical function. One source of truth.

### Chat and credits

| Table | Key fields | Notes |
|---|---|---|
| `chat_threads` | `listing_id`, `buyer_id`, `seller_id`, `buyer_credit_txn_id`, `last_message_at` | Unique on (`listing_id`, `buyer_id`) |
| `messages` | `thread_id`, `sender_role` (`buyer` or `seller`), `body`, `read_at` | Text only for v1 |
| `credit_ledger` | `user_id`, `delta`, `reason` (`purchase`, `chat_open`, `admin_adjust`, `refund`), `ref_id`, `balance_after` | Append only. `users.credit_balance` is a cached mirror written in the same transaction |

Opening a chat is a single transaction: check the balance, write a `-1` ledger row, create the
thread, increment `distinct_buyer_chat_count`, then apply the push-to-bottom rule if the threshold
is reached. Reopening an existing thread costs nothing.

### Payments

| Table | Key fields | Notes |
|---|---|---|
| `payment_platforms` | `name`, `logo_url`, `utr_term` (for example "UPI transaction ID"), `app_txn_term` (for example "Google transaction ID"), `explanatory_image_url`, `sort_order`, `is_active` | Exactly the admin screen in the reference image |
| `plans` | `category` (`credits`, `seller_chat_unlock`, `boost`), `label`, `price`, `credits_granted?`, `boost_days?`, `qr_image_url`, `qr_upi_id`, `is_active`, `sort_order` | One QR per price point per category, as required |
| `payment_requests` | `user_id`, `plan_id`, `platform_id`, `amount`, `txn_id` (unique), `target_type` (`wallet`, `listing_unlock`, `listing_boost`), `target_listing_id?`, `status` (`pending`, `accepted`, `rejected`), `reviewed_by_admin_id`, `reviewed_at`, `reject_reason` | Accepting performs the grant in the same transaction |
| `notifications` | `user_id`, `type`, `title`, `body`, `ref_id`, `read_at` | The header bell shows the latest 6 |

Grant on acceptance, by `target_type`:

- `wallet`: add `plan.credits_granted` to the ledger.
- `listing_unlock`: set `listings.chat_unlocked_at`, which swaps the Unlock Chat button for Close
  Listing and lets the seller read and reply on that listing.
- `listing_boost`: create a `listing_boosts` row, set `is_boosted`, set `boost_expires_at`, and set
  `boost_order_key = now()`.

---

## 5. Screen inventory

### Public

1. Landing page: hero, college and course search with type ahead, results using the shared
   ordering engine, sign in call to action. Chat buttons prompt the visitor to sign in.

### Authenticated (bottom nav on mobile, top nav on desktop: Buy, Chat, Sell)

2. Header: platform name on the left, credit balance on the right, notification bell showing the
   latest 6 notifications.
3. Buy: sub-tabs Available and Sold Out, a search sheet (university defaults to the user's own,
   course optional), listing cards with the initials avatar, course name, college abbreviation,
   price and a Chat button.
4. Chat: sub-tabs Buy Chats and Sell Chats, thread list with course name and initials avatar,
   conversation view, and a locked state for sellers who have not unlocked that listing.
5. Sell: create listing form (course, college and price, with type ahead on both lists), listing
   cards showing every entered field, the current rank within its college, and the Edit, Unlock
   Chat, Boost, Close and Delete actions in their correct states.
6. Payment flow: step 1 platform picker modal, step 2 QR with the amount, download QR button, the
   platform specific UTR label, the do-not-paste warning for the app transaction ID, the
   explanatory image, the UTR input and submit.
7. Profile and settings: view and edit name, college, branch and graduation year.

### Admin (`/admin`)

8. Login and a dashboard with counts.
9. Master lists: three tabs (colleges with abbreviation, branches, courses) plus the pending
   request queue with Add to master list, Ignore, and Modify user entry only.
10. Payment platforms: logo, UTR term, app transaction term and explanatory image per platform.
11. Plans and QR codes: credit packs, seller unlock prices, boost plans, each with duration, price
    and QR upload.
12. Payments management: searchable by phone or transaction id, status filter, accept and reject.
13. User access: employee admins with per page permissions, plus test accounts with fixed OTP, a
    paid services toggle, test mode and redo onboarding.
14. Users: list, search, credit balance, manual adjustment, block.
15. Listings: moderate, force close, delete.

---

## 6. Delivery roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| 0. Foundation | Repo, Next.js, Tailwind, Prisma, Supabase, env config, CI lint and typecheck, base UI kit, responsive app shell | A clean production build, nav works on mobile and desktop |
| 1. Auth | Phone registration, OTP send and verify, type ahead for college and branch, JWT sessions, test account bypass, rate limits | A real phone registers and logs in; a test number logs in with the fixed OTP |
| 2. Master lists | Three lists, normalisation and exact match detection, instant user side availability, request queue, the three admin actions, branch seed data | Typing a new college works instantly and appears in the admin queue |
| 3. Listings and Buy | Create, edit price, close, delete, Available and Sold Out tabs, search and filters, ordering engine with unit tests, seller rank display | Ordering tests pass for all ten rules in section 4 |
| 4. Chat and credits | Credit ledger, atomic chat open, thread list, realtime messages, anonymity, seller lock state, chat threshold reordering | Opening a chat deducts exactly one credit and never double charges |
| 5. Payments | Plans and QR configuration, platform picker, QR screen with download, UTR submit, admin accept and reject, automatic grants, notifications | Each of the three categories grants the right thing on acceptance |
| 6. Admin panel | Remaining admin pages, employee accounts, per page permissions, test account management, audit log | An employee scoped to 3 pages cannot open the fourth |
| 7. Landing and notifications | Public search sharing the ordering engine, notification bell with the latest 6, rejection notices | Public and logged in results are provably identical |
| 8. Polish and hardening | Mobile app feel, empty and loading states, accessibility, security headers, Playwright suite, seed and demo data | The end to end suite is green |
| 9. Launch | Supabase production project, MSG91 DLT templates, Vercel domain, admin handover doc, runbook | The owner can run the platform without the developer |

Dependencies: phase 2 blocks 3, phase 3 blocks 4, phases 4 and 5 block 6, everything blocks 8.

---

## 7. Testing strategy

- Unit (Vitest): ordering engine permutations, initials and abbreviation helpers, normalisation
  and exact match logic, credit ledger invariants, boost expiry maths, grant resolution per category.
- Integration: Prisma against a test database for the chat open transaction and the payment
  acceptance transaction, including concurrent attempts.
- End to end (Playwright): register, create a listing, a second user opens chat, credits deducted,
  seller unlocks through a payment, admin accepts, listing closes, public search matches the Buy page.
- A manual checklist per phase, tracked in `TASKS.md`.

---

## 8. Non functional targets

| Target | Value |
|---|---|
| First contentful paint on 4G mobile | under 1.5s |
| Listing feed query | under 150ms at 50k listings, with indexes on the bucket keys, college, course and status |
| Chat message delivery | under 500ms |
| Accessibility | keyboard navigable, visible focus, AA contrast on the white theme |
| Browser support | last 2 versions of Chrome, Safari, Firefox and Edge, plus Android Chrome and iOS Safari |

---

## 9. Open questions for the product owner

Blocking questions are marked **[B]**. Work on the affected module will not start until answered.

### Product and legal

1. Should a terms page and disclaimer be included, and who provides the copy?

### Platform

2. **[B]** Approve the stack in section 2 (Next.js, PostgreSQL, Supabase, Vercel, MSG91), or state
   a preference for a self hosted VPS setup.
3. **[B]** Who owns the SMS account and the DLT template registration (mandatory in India), and
   what is the monthly OTP budget? Until that exists, development uses a mock SMS provider that
   prints the OTP to the server log.
4. Expected scale in the first semester (users, listings, daily OTPs) so indexes and plans are sized.
5. Domain name for the site, and for the admin panel.

### Credits and chat

6. **[B]** One credit per **new seller**, or one credit per **listing**? The PRD says "contact a
   new seller", but threads are per listing. If one seller has three listings, does contacting all
   three cost one credit or three? Recommendation: per listing, because the chat count rule that
   drives sorting is per listing.
7. If a buyer opens a chat on a listing whose seller has not unlocked chat, the buyer spends a
   credit and may never get a reply. Should the Chat button be disabled, show a warning, or refund
   the credit automatically if the seller never unlocks? Recommendation: a clear warning first.
8. Can buyers and sellers send images or files, or is chat text only for v1? Assumed text only.
9. Should a thread stay accessible after a listing is closed or deleted? Assumed yes when closed,
   and read only when deleted.

### Ordering

10. After a normal listing is pushed to the bottom at 3 chats, does it move again at 6, 9 and so
    on, or only once? Assumed once, until it is boosted.
11. Among boosted listings, does "most recently created first" mean the most recent listing
    creation or the most recent boost purchase? Assumed boost purchase.
12. Does the Sold Out tab use the same ordering, and should sold out listings still show the price?

### Listings

13. Confirm that Close Listing is what moves a listing into the Sold Out tab, and that Delete
    removes it from both tabs entirely.
14. Is there a limit on how many active listings one seller can create?
15. Is the seller unlock price a single admin set amount, or several plans like the credit packs?
    The reference screenshots suggest a single price per unlock.

### Master lists

16. Confirm that colleges and courses both start empty and that only the branch list is pre seeded.
17. When an admin adds a user submitted entry to the master list, should every other user who typed
    the same text be relinked to the new master entry automatically? Recommendation: yes.
18. Is `Course` a subject level course (for example "Data Structures CS201") or a degree programme?
    The listing flow implies subject level. This changes the seed data, so please confirm.

### Payments

19. The exact credit pack, unlock and boost price points for launch. The PRD gives examples only.
20. May a user resubmit a corrected transaction ID after a rejection, or is a rejected UTR
    permanently burned? Recommendation: allow one correction.
21. Should an admin be able to grant credits or unlocks manually without a payment request?
    Recommendation: yes, with an audit log entry.

### Admin

22. Confirm the exact list of admin pages that employee permissions can be scoped to.
23. The reference screenshot shows owner account edits requiring an OTP to a specific phone number.
    Should that be included, and to which number?
24. Should the admin panel live at `/admin` on the same domain, or on a separate subdomain?

### Design

25. Is there a logo, a brand name treatment, or an accent colour beyond white? The reference admin
    screenshots use a violet accent. Confirm whether to match it.
