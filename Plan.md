# Plan.md - BuyEl session context

Context document for multi-threaded conversations. Updated after every prompt completion.

## Project

BuyEl, a university course marketplace for Indian students. Students who secured a course
registration list it, other students browse and pay in-app credits to open an anonymous chat with
the seller. Monetised through credit packs, per listing seller chat unlocks and paid listing
boosts. All payments are manual UPI QR with admin verification. No payment gateway.

- Working directory: `C:\Documents\BuyEl`
- Requirements document (single source of truth): `C:\Documents\BuyEl Docs\BuyEl PRD.docx`
- Git: initialised, default branch `main`, no remote configured yet
- Owner / client contact named in the PRD: Prateek Chauhan (admin owner account)

## Current state (2026-11-21)

Phases 0 to 3 are complete and verified end to end in the browser against the live database.
`next build`, `tsc --noEmit`, `eslint` and `vitest` are all clean. A real account was registered
(+919876500011, Abhishek Singh), signed out, and signed back in without re-entering the profile.

Delivered this session:
- Extracted and read the full PRD, including all six embedded reference screenshots
  (payment platform picker, QR and UTR submit screen, admin payment platforms config,
  prioritisation plans config, payments management table, user access and test accounts).
- `PROJECT_PLAN.md`: product summary, technology stack, architecture, full database schema,
  the ten rule ordering engine, screen inventory, nine phase roadmap, testing strategy,
  non functional targets, and 25 open questions.
- `TASKS.md`: phase by phase task board with blocked items mapped to question numbers.
- Next.js 16 app scaffolded in the repo root: Tailwind v4 white theme with a violet accent,
  UI kit (Button, TextField, ComboBox, Avatar, Card, Badge, EmptyState, Skeleton), responsive
  shell with a desktop top nav and a mobile bottom bar, credit balance and a bell limited to the
  latest 6 notifications.
- Full Prisma schema for every module in the PRD (22 models), validated and generating.
- Phone and OTP authentication: bcrypt hashed codes, 5 minute expiry, DB backed rate limits,
  JWT access plus rotating refresh in httpOnly cookies, test account fixed OTP bypass, a single
  server action state machine for phone to OTP to profile, and sign out.
- Master list service implementing all of PRD section 16, including the three admin actions.
- Seed script: Indian UG and PG branch list, owner admin account, the four payment platforms.
- Public landing page.
- Admin panel (`/admin`): own login and session cookie, per page permissions, sidebar that hides
  what an account cannot see, dashboard with counts, and a full audit log on every write.
- Listings: create (free), edit price, close, reopen, delete, with the course and college names
  write once after confirmation.
- The ordering engine: two pure modules, `ordering.rules.ts` for the ten PRD rules and
  `ordering.service.ts` for the queries, with 20 unit tests.
- Buy page: Available and Sold Out tabs, search by university and course with the student's own
  university preselected, anonymous listing cards, pagination across both buckets.
- Sell page: create form, and a card per listing showing every field, the live rank within its
  own college, and Edit price, Unlock chat, Boost, Close, Reopen and Delete in correct states.
- Master lists admin page: colleges, branches and courses with search, pagination, add, edit,
  delete and case insensitive duplicate rejection, plus the pending request queue carrying all
  three PRD 16.3 actions.

## Approach and strategy

- Build module by module in the roadmap order. Nothing is a placeholder; every feature in the PRD
  ships working.
- All business rules live in pure TypeScript services under `src/server/services` so they can be
  unit tested without React or a browser. The ordering engine and the credit ledger get the
  heaviest test coverage because they are where the PRD is most specific and most fragile.
- The public landing search and the logged in Buy page call the same ordering function, as the PRD
  explicitly requires identical results.
- Master list entries are stored as a pair: an optional foreign key to the official list plus the
  raw text the user typed. That single decision satisfies all of PRD section 16 (instant use,
  admin review, correction without promotion).

## Key decisions and reasoning

| Decision | Reasoning |
|---|---|
| Next.js 16 App Router, single repo for user site and admin panel | One deploy, shared types and services, faster delivery |
| PostgreSQL with Prisma | Credit spends and payment grants need real transactions |
| Supabase Realtime instead of Socket.IO | Vercel serverless cannot hold WebSocket connections, avoids a second always-on service |
| APITxt behind an SMS adapter | The owner already has the APITxt account and API access. The adapter keeps a mock provider for local development |
| Two ordering keys (`normal_order_key` ascending, `boost_order_key` descending) plus one-shot push flags | Expresses all of the PRD sorting rules with a single indexed query and no background job |
| Boost expiry evaluated at read time | No cron dependency, always correct |
| Append only credit ledger with a cached balance | Auditable, prevents double spend under concurrency |
| Unique transaction id across payment requests | Blocks replaying one UPI payment for several unlocks |

## Owner answers (2026-11-21)

1. Stack approved: Next.js 16, Supabase PostgreSQL with Prisma, Supabase Realtime and Storage,
   Vercel.
2. OTP is sent through **APITxt**, the owner's existing third party service. Still needed: API key,
   sender id, template id and the API documentation. Development runs on the mock provider until
   then.
3. Credits: **one credit per listing**, not per seller. Three listings from one seller cost three.
4. Locked seller chat: the buyer experience is **identical** whether or not the seller has unlocked
   chat. No warning, no block, no refund. The seller just cannot read or reply until they unlock.

## Decisions taken while building

| Decision | Reasoning |
|---|---|
| Prisma 7 with the `@prisma/adapter-pg` driver adapter | Prisma 7 no longer ships the Rust query engine, so an adapter is required |
| Rate limiting in Postgres instead of Upstash Redis | Removes a third party service and an account to manage; OTP volumes are far below what a table can handle |
| One server action state machine for the whole sign in flow | No duplicated client state and no effects, which also satisfies the React 19 lint rules |
| APITxt driven by a URL template in the env file | Their request shape is not publicly documented, so the exact URL can be dropped in with no code change |
| Colleges and courses seeded empty, branches pre seeded | Owner confirmed on 2026-11-21 |

## OTP delivery (APITxT)

Integrated against the documented unified OTP endpoint
(https://apitxt.com/developer/otp-api):

    POST https://apitxt.com/api/sendOTP   (application/x-www-form-urlencoded)
    authkey, mobile (digits with country code), otp, channel=sms, country=91
    template_id optional; omitted means the account default template

APITxT renders the message from its own template, which is what carries the DLT
registration, so BuyEl never sends message text and needs no DLT template of its own.
`SMS_PROVIDER=apitxt` is live. Set it to `mock` for free local testing, which prints the
code and shows it on the login screen.

Verified against the live API during integration: a valid key with a well formed number
returns `{"status":"success","data":{"request_id":...}}`, a malformed number returns HTTP 400,
a bad key returns HTTP 401 `AUTH_FAILED`, and repeat sends return HTTP 429. All four shapes
are covered by unit tests. Their own limit is 3 OTPs per number per minute, which sits above
our 60 second resend cooldown.

Test accounts never reach APITxT. `+910000000001` with fixed OTP `010010` exists in the
database for development.

## Database connection (important)

Supabase project `hpdanwmpzmviamplunqa` is in **ap-southeast-1**, and its direct host
`db.<ref>.supabase.co` resolves to IPv6 only, which this machine cannot route. The working
connection is the session pooler:

    postgresql://postgres.hpdanwmpzmviamplunqa:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

The password contains `@`, so it must stay percent encoded as `%40` inside the URL.
Migration `20261121162318_init` is applied. The seed has run: 134 branches, the owner admin with
all 8 page permissions, and 4 payment platforms. Colleges and courses are empty by design.

## Phase 2 verification (done against real data)

- Add to master list: "Delhi Technological University" with short form DTU became an official
  college, and the student who typed it was linked to it automatically.
- Fix this student's entry only: a student who had typed "DTU" was corrected to the full name,
  got a notification, and the master list stayed at one college. A correction that matches an
  existing official entry now links to it as well, which is a small improvement on the PRD text.
- Ignore: the request left the queue and nothing else changed.
- Each action wrote an audit row.
- Typing "dtu" in the student type-ahead now returns Delhi Technological University, so the
  abbreviation requirement in PRD 16.1 works end to end.
- A view only employee was created, signed in, saw only the page they were granted, was
  redirected off the dashboard, and got a read only master list with no Add, Save or Delete.
  That account was deleted afterwards.

## Phase 3 verification (done against real data)

Six listings were seeded with controlled keys and the Buy page returned exactly the predicted
order: newest boost, older boost, then the normal bucket oldest first, with a listing whose
boost had expired falling back into the normal bucket in its correct position by age. A listing
created through the form landed at the very bottom and showed rank #6; granting it a boost moved
it to rank #1 and to the top of the feed. Closing a listing moved it to Sold Out, and the Close
button only appeared once chat was unlocked for that listing.

Two deliberate decisions worth confirming:

- A student does not see their own listings on the Buy page, since chatting with yourself makes
  no sense. They see them all on Sell.
- Delete is a soft delete. The listing leaves both tabs, and the row is kept so existing
  conversations and payment history stay readable.

Test data in the database: listings with ids `ord1` to `ord6` were seeded by hand to prove the
ordering. Remove them with `delete from listings where id like 'ord%';` whenever you like.

## Still open

Full list in `PROJECT_PLAN.md` section 9. Nothing blocks phases 0, 1, 3 or 4. Outstanding:

- Q16 and Q18: do colleges and courses start empty, and is a "Course" a subject or a degree
  programme. Needed before the master list seed (phase 2).
- Q19: launch price points for credit packs, seller unlocks and boosts. Needed before phase 5 go live.
- Q23: whether owner account edits need an OTP, and to which number. Needed in phase 6.
- Q1: terms page and disclaimer, since reselling course registrations may conflict with university
  policy. Product and legal decision, not technical.

## Next steps

1. Phase 4: the credit ledger and chat, which wires up the Chat button and makes
   `applyChatThreshold` fire for real.
2. Phase 5: payments, which turns on Unlock chat and Boost.
3. Phase 2 admin review queue UI, then phase 3 listings, Buy page and the ordering engine.
4. Keep `TASKS.md` statuses current and update this file after every completed prompt.
