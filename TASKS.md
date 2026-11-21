# BuyEl - Task Board

Status legend: `[ ]` not started, `[~]` in progress, `[x]` done, `[!]` blocked on an answer.

Blocked items reference the question numbers in `PROJECT_PLAN.md` section 9.

---

## Phase 0 - Foundation

- [x] 0.1 Scaffold Next.js 16 app with TypeScript, App Router, ESLint, Prettier
- [x] 0.2 Tailwind CSS v4 setup, white theme tokens, typography scale, spacing scale
- [~] 0.3 Base UI kit: Button, TextField, ComboBox (type ahead), Avatar (initials), Card, Badge, EmptyState, Skeleton, PageHeading are done. Modal, BottomSheet, Tabs and Toast land with the screens that need them in phase 3
- [x] 0.4 Responsive app shell: desktop top nav, mobile bottom nav, header with brand, credit balance and notification bell
- [x] 0.5 Prisma 7 with the pg driver adapter, full schema, `.env.example`, prisma.config.ts
- [~] 0.6 Vitest configured and green. Playwright and the CI workflow come with phase 8
- [ ] 0.7 Error boundary, 404 and 500 pages, logging helper

## Phase 1 - Authentication

- [~] 1.1 APITxt wired through a URL template. Needs the send URL, sender id and template id from the owner, then flip `SMS_PROVIDER=apitxt`
- [x] 1.2 SMS adapter interface with `apitxt` and `mock` implementations
- [x] 1.3 `otp_codes` table, send OTP, bcrypt hashed codes, 5 minute expiry, attempt counter
- [x] 1.4 Rate limiting: 60s resend cooldown, 3 per hour, 10 per day, 10 verify attempts per 10 minutes
- [x] 1.5 Verify OTP, JWT access token and rotating refresh token in httpOnly cookies, session table
- [x] 1.6 Registration flow: phone, name with optional last name, college, branch, graduation year
- [x] 1.7 Login flow: phone and OTP only, no profile re-entry, lands on Buy
- [x] 1.8 Test account bypass: fixed OTP, no SMS sent, redo onboarding honoured
- [x] 1.9 Route protection in the app layout, sign out, session revocation
- [~] 1.10 Unit tests green for the text and phone helpers. OTP lifecycle integration tests need the database connection

## Phase 2 - Master lists (colleges, branches, courses)

- [ ] 2.1 Tables for `colleges`, `branches`, `courses`, `master_list_requests`
- [ ] 2.2 Normalisation helper (lowercase, trim, collapse whitespace) and exact match detection
- [ ] 2.3 College abbreviation field, abbreviation aware suggestion search
- [ ] 2.4 Seed the Indian UG and PG branch list
- [!] 2.5 Seed decision for colleges and courses (blocked on Q16, Q18)
- [ ] 2.6 ComboBox API: debounce, prefix and substring matching, keyboard navigation
- [ ] 2.7 Free text submission: usable immediately for that user, request queued for admin
- [ ] 2.8 Admin requests queue UI with the three actions
- [ ] 2.9 Action: add to master list, with optional correction, and relink of matching users (Q17)
- [ ] 2.10 Action: ignore request, leaving the user entry untouched
- [ ] 2.11 Action: modify the user entry only, without touching the master list
- [ ] 2.12 Admin CRUD for all three lists
- [ ] 2.13 Unit tests for normalisation, matching, and each admin action

## Phase 3 - Listings, Buy page and the ordering engine

- [ ] 3.1 `listings` table with both ordering keys and both push-to-bottom flags
- [ ] 3.2 Create listing form: course, college, price, with type ahead and free text fallback
- [ ] 3.3 Immutability guard on course name and college name after confirmation
- [ ] 3.4 Edit price action
- [ ] 3.5 Close listing action, gated on chat being unlocked for that listing
- [ ] 3.6 Delete listing action, removed from Available and Sold Out
- [ ] 3.7 `ordering.service.ts` implementing rules 1 to 10 from the plan
- [ ] 3.8 Unit tests covering every ordering rule and their interactions
- [ ] 3.9 Buy page: Available tab, listing card with initials avatar, course, college abbreviation, price, Chat button
- [ ] 3.10 Buy page: Sold Out tab
- [ ] 3.11 Search sheet: university defaults to the user's own, course optional, change university allowed
- [ ] 3.12 Sell page: listing cards with every field, all five actions in the correct states
- [ ] 3.13 Seller rank display, scoped to the listing's own college, updating with boost
- [ ] 3.14 Pagination or infinite scroll with the ordering preserved
- [ ] 3.15 Indexes for the feed query, verified with EXPLAIN ANALYZE

## Phase 4 - Chat and in-app currency

- [x] 4.1 Credit semantics confirmed: one credit per listing
- [ ] 4.2 `credit_ledger` table, append only, cached balance on the user row
- [ ] 4.3 Atomic chat open transaction: balance check, debit, thread create, chat count increment
- [ ] 4.4 Push-to-bottom trigger at 3 chats (normal) and 4 chats (boosted)
- [ ] 4.5 Insufficient credits state, link into the credit purchase flow
- [x] 4.6 Confirmed: buyer experience is identical whether or not the seller has unlocked chat. No warning, no block, no refund
- [ ] 4.7 Chat page: Buy Chats and Sell Chats sub-tabs, thread list with course name and initials
- [ ] 4.8 Conversation view, realtime send and receive through Supabase Realtime
- [ ] 4.9 Seller locked state: Unlock Chat call to action instead of the composer
- [ ] 4.10 Anonymity audit: no name, phone, college or any identifier in any chat payload
- [ ] 4.11 Unread counts, last message preview, ordering by recency
- [ ] 4.12 Unit and integration tests for double spend, concurrent opens, re-entry being free

## Phase 5 - Payments and QR verification

- [ ] 5.1 `payment_platforms` table and admin screen: logo, UTR term, app transaction term, explanatory image
- [ ] 5.2 `plans` table and admin screen for the three categories, each with price, QR and duration or credits
- [!] 5.3 Launch price points entered (blocked on Q19)
- [ ] 5.4 Step 1 modal: price, what is being bought, platform picker
- [ ] 5.5 Step 2 modal: QR image, amount, download QR, platform specific labels, explanatory image, do-not-paste warning
- [ ] 5.6 UTR input, validation, uniqueness check, submit, pending state on the user side
- [ ] 5.7 Admin payments page: search by phone or transaction id, status filter, pagination
- [ ] 5.8 Accept action, with the grant performed inside the same transaction
- [ ] 5.9 Reject action with reason and a user notification
- [ ] 5.10 Grants: wallet credits, listing chat unlock, listing boost
- [ ] 5.11 Re-boost of an already boosted listing
- [ ] 5.12 Boost expiry handled at read time plus a nightly sweep
- [ ] 5.13 Tests for each grant path and for duplicate UTR rejection

## Phase 6 - Admin panel

- [ ] 6.1 Admin auth, separate cookie, seeded owner account
- [ ] 6.2 Per page permission model and route guards
- [ ] 6.3 User Access page: create and edit employee admins, assign pages
- [!] 6.4 Owner edit OTP verification (blocked on Q23)
- [ ] 6.5 Test Accounts section: create, fixed OTP, paid services toggle, test mode, redo onboarding
- [ ] 6.6 Users page: search, profile, credit balance, manual adjustment, block
- [ ] 6.7 Listings page: moderate, force close, delete
- [ ] 6.8 Dashboard counts, with test accounts excluded from statistics
- [ ] 6.9 Audit log of every admin action, viewable in the panel

## Phase 7 - Public landing page and notifications

- [ ] 7.1 Landing page layout, hero, value proposition, sign in call to action
- [ ] 7.2 Public search by college and course, reusing the ordering engine unchanged
- [ ] 7.3 Chat button on public results prompts registration
- [ ] 7.4 `notifications` table and service
- [ ] 7.5 Header bell with the latest 6 notifications, unread dot, mark as read
- [ ] 7.6 Notification triggers: payment rejected, payment accepted, boost expired, admin corrected an entry
- [ ] 7.7 Test proving public and logged in results are identical for the same filters

## Phase 8 - Polish, performance and hardening

- [ ] 8.1 Mobile app feel pass: bottom nav, sheets, tap targets, safe areas, no horizontal scroll
- [ ] 8.2 Loading skeletons and empty states on every list
- [ ] 8.3 Accessibility pass: labels, focus order, contrast, screen reader checks
- [ ] 8.4 Security headers, CSP, CSRF, dependency audit
- [ ] 8.5 Playwright end to end suite for the full buyer and seller journey
- [ ] 8.6 Seed and demo data script
- [ ] 8.7 Lighthouse and query performance targets met

## Phase 9 - Launch

- [ ] 9.1 Production Supabase project, migrations, backups
- [ ] 9.2 MSG91 DLT template approval and production keys
- [ ] 9.3 Domain, DNS, Vercel production deploy
- [ ] 9.4 Owner handover: admin guide, runbook, how to add plans and QR codes
- [ ] 9.5 Post launch monitoring and error reporting

---

## Blocked right now

| Task | Question |
|---|---|
| all database work | `DATABASE_URL` for the Supabase project `hpdanwmpzmviamplunqa`, plus the anon and service role keys. Nothing has been migrated or seeded yet |
| 1.1 | APITxt send URL, sender id and template id (development runs on the mock provider meanwhile) |
| 2.5 | Q16, Q18 seed data for colleges and courses, and what a Course means |
| 5.3 | Q19 launch price points |
| 6.4 | Q23 owner edit OTP |

Phases 0 and 1 are written and build clean. They cannot be run end to end until the database connection string arrives.
