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

- [x] 1.1 APITxT integrated against https://apitxt.com/api/sendOTP and switched on (`SMS_PROVIDER=apitxt`), verified live: valid key accepted, bad key rejected, rate limit handled
- [x] 1.2 SMS adapter interface with `apitxt` and `mock` implementations, pure request builder and response reader under unit test
- [x] 1.3 `otp_codes` table, send OTP, bcrypt hashed codes, 5 minute expiry, attempt counter
- [x] 1.4 Rate limiting: 60s resend cooldown, 3 per hour, 10 per day, 10 verify attempts per 10 minutes
- [x] 1.5 Verify OTP, JWT access token and rotating refresh token in httpOnly cookies, session table
- [x] 1.6 Registration flow: phone, name with optional last name, college, branch, graduation year
- [x] 1.7 Login flow: phone and OTP only, no profile re-entry, lands on Buy
- [x] 1.8 Test account bypass: fixed OTP, no SMS sent, redo onboarding honoured
- [x] 1.9 Route protection in the app layout, sign out, session revocation
- [x] 1.10 Unit tests green, and the whole flow verified in the browser against the live Supabase database: register, OTP, profile, sign out, sign in again without re-entering the profile

## Phase 2 - Master lists (colleges, branches, courses)

- [x] 2.1 Tables for `colleges`, `branches`, `courses`, `master_list_requests`
- [x] 2.2 Normalisation helper (lowercase, trim, collapse whitespace) and exact match detection
- [x] 2.3 College abbreviation field, abbreviation aware suggestion search (typing "dtu" finds Delhi Technological University)
- [x] 2.4 Seed the Indian UG and PG branch list (134 entries)
- [x] 2.5 Colleges and courses start empty, confirmed by the owner
- [x] 2.6 ComboBox API: debounce, prefix and substring matching, keyboard navigation
- [x] 2.7 Free text submission: usable immediately for that user, request queued for admin
- [x] 2.8 Admin requests queue UI with the three actions
- [x] 2.9 Action: add to master list, with optional correction, and relink of every matching user and listing
- [x] 2.10 Action: ignore request, leaving the user entry untouched
- [x] 2.11 Action: modify the user entry only, without touching the master list, with a notification to that student
- [x] 2.12 Admin CRUD for all three lists, with search, pagination and case insensitive duplicate rejection
- [~] 2.13 Normalisation, matching and abbreviation logic are unit tested. The admin actions were verified end to end in the browser against the live database; automated integration tests for them need a throwaway test database, which is set up in phase 8

Also delivered here, ahead of phase 6, because the queue needs it:

- [x] Admin authentication with its own session cookie and the seeded owner account
- [x] Per page permission model, with the sidebar, the pages and every action guarded
- [x] Audit log written on every admin write
- [x] Admin dashboard with counts, excluding test accounts

## Phase 3 - Listings, Buy page and the ordering engine

- [x] 3.1 `listings` table with both ordering keys and both push-to-bottom flags
- [x] 3.2 Create listing form: course, college, price, with type ahead and free text fallback
- [x] 3.3 Immutability guard on course name and college name after confirmation
- [x] 3.4 Edit price action
- [x] 3.5 Close listing action, gated on chat being unlocked for that listing
- [x] 3.6 Delete listing action, with a confirmation step, removed from Available and Sold Out
- [x] 3.7 `ordering.rules.ts` and `ordering.service.ts` implementing rules 1 to 10
- [x] 3.8 20 unit tests covering every ordering rule, their interactions, and the exact Abhishek scenario from the PRD
- [x] 3.9 Buy page: Available tab, listing card with initials avatar, course, college short form, price, Chat button
- [x] 3.10 Buy page: Sold Out tab
- [x] 3.11 Search: university defaults to the student's own, course optional, both changeable
- [x] 3.12 Sell page: listing cards with every field and all actions in their correct states
- [x] 3.13 Seller rank, scoped to the listing's own college, updating when the listing is boosted
- [x] 3.14 Pagination with the ordering preserved across the two buckets
- [~] 3.15 Indexes for the feed query exist in the schema. Measuring them with EXPLAIN ANALYZE needs a realistic data volume, which comes with the phase 8 seed script

Carried into phase 4 and 5 by design:

- The Chat button renders on every Available card but does nothing yet, because spending a
  credit to open a chat is phase 4.
- Unlock Chat and Boost are shown in their correct states but are disabled, because both are
  paid actions and payments are phase 5. `applyChatThreshold` and the boost grant are written
  and unit tested, and were exercised by setting the same database fields those steps will set.

## Phase 4 - Chat and in-app currency

- [x] 4.1 Credit semantics confirmed: one credit per listing
- [x] 4.2 `credit_ledger` table, append only, with the cached balance written in the same transaction
- [x] 4.3 Atomic chat open: compare and decrement, thread create, chat count increment, all in one transaction
- [x] 4.4 Push-to-bottom fires from a real chat open, at 3 chats normal and 4 boosted
- [x] 4.5 Insufficient credits state on the Chat button, pointing at the purchase step
- [x] 4.6 Confirmed: the buyer experience is identical whether or not the seller has unlocked chat
- [x] 4.7 Chat page: Buy Chats and Sell Chats sub-tabs, thread list with course name and initials
- [x] 4.8 Conversation view, send and receive, with new messages arriving by polling
- [x] 4.9 Seller locked state: how many messages are waiting, no content, Unlock chat call to action
- [x] 4.10 Anonymity: the thread view type carries no name, phone or user id, and a test asserts it
- [x] 4.11 Unread dots per conversation, last message preview, ordered by most recent activity
- [x] 4.12 15 unit tests for the chat rules. Double spend, rollback on no credits and free re-entry were verified live against the database

Deviation from the plan, with the reason:

- Realtime was planned on Supabase Realtime. That needs the anon key to read the `messages`
  table, which would expose every conversation, and our sessions are our own JWTs rather than
  Supabase Auth, so row level security cannot key off them. Messages therefore arrive by a
  3 second poll of an endpoint that checks the caller is a participant. Swapping it later only
  touches `Conversation.tsx`.
- Buying credits is phase 5, so the only way to hold credits today is an admin or SQL grant.

## Phase 5 - Payments and QR verification

- [x] 5.1 `payment_platforms` admin screen: logo, UTR term, app transaction term, explanatory image
- [x] 5.2 `plans` admin screen for all three categories, each with price, QR upload, duration or credits
- [x] 5.3 Launch price points are the owner's to set. Three were created through the real form while testing (49 for 2 credits, 29 to unlock, 39 for 10 days) and can be changed or deleted
- [x] 5.4 Step 1 modal: price, what you get, payment app picker
- [x] 5.5 Step 2 modal: QR for that exact price, download QR, UPI ID, platform specific labels, explanatory image, do-not-paste warning
- [x] 5.6 Transaction ID input, normalisation, validation, uniqueness, submit, pending state that blocks paying twice
- [x] 5.7 Admin payments page: search by phone or transaction ID, status filter, pagination
- [x] 5.8 Accept, with the grant applied before the status changes
- [x] 5.9 Reject with a reason, and a notification carrying that reason to the student
- [x] 5.10 All three grants: wallet credits, listing chat unlock, listing boost
- [x] 5.11 Re-boost of an already boosted listing, adding to the time left rather than replacing it
- [x] 5.12 Boost expiry honoured at read time, plus a nightly sweep at `/api/cron/sweep-boosts` scheduled in `vercel.json`
- [x] 5.13 17 unit tests for the payment rules. Every grant path and the duplicate reference guard were exercised live against the database

Images are stored in a public Supabase Storage bucket (`buyel-public`) through the service role
key, server side only.

One thing could not be driven from here: the QR file picker. File inputs cannot be operated by
the browser tool, so the upload code was exercised against the real storage API directly and the
resulting public URL attached to the three plans. Upload a QR through the admin form yourself to
confirm the last step.

## Phase 6 - Admin panel

- [x] 6.1 Admin auth, separate cookie, seeded owner account (done in phase 2)
- [x] 6.2 Per page permission model and route guards (done in phase 2, verified with a view only employee)
- [x] 6.3 User Access page: create and edit employee admins, with a view and edit tick per page
- [x] 6.4 Owner account edits require an OTP to +917819812678
- [x] 6.5 Test Accounts section: create, fixed OTP, paid services toggle, test mode, redo onboarding
- [x] 6.6 Students page: search, profile, credit balance, manual adjustment with a reason, block and unblock
- [x] 6.7 Listings page: moderate, close, reopen, remove, each notifying the seller
- [x] 6.8 Dashboard counts, with test accounts left out of the student count
- [x] 6.9 Activity log page showing every admin action in plain language

Notes:

- Blocking a student also revokes their open sessions, so they are signed out immediately.
- A manual credit adjustment goes through the same ledger as a purchase, never a bare balance
  edit, so the ledger always explains the balance.
- Admin moderation can close a listing even when the seller has not unlocked chat. The seller's
  own Close button still requires the unlock, exactly as the PRD says.
- Payment platforms live on the Plans and QR codes page rather than having a page of their own,
  since they are configured together. The permission key `payment_platforms` still exists.
- The owner OTP was verified by pointing `ADMIN_OWNER_OTP_PHONE` at a test account number, so no
  SMS was sent to the real number. The env file is back to +917819812678.

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
| 5.3 | Q19 launch price points, though the owner will set these in the admin panel |
| 6.4 | Q23 owner edit OTP, answered: send to +917819812678, still to build |

Phases 0 to 6 are done and verified against the live database. The admin panel is complete. Phase 7 (the public landing search and notification triggers) is next.
