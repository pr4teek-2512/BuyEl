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

Planning complete, no application code written yet.

Delivered this session:
- Extracted and read the full PRD, including all six embedded reference screenshots
  (payment platform picker, QR and UTR submit screen, admin payment platforms config,
  prioritisation plans config, payments management table, user access and test accounts).
- `PROJECT_PLAN.md`: product summary, technology stack, architecture, full database schema,
  the ten rule ordering engine, screen inventory, nine phase roadmap, testing strategy,
  non functional targets, and 25 open questions.
- `TASKS.md`: phase by phase task board with blocked items mapped to question numbers.

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

## Still open

Full list in `PROJECT_PLAN.md` section 9. Nothing blocks phases 0, 1, 3 or 4. Outstanding:

- Q16 and Q18: do colleges and courses start empty, and is a "Course" a subject or a degree
  programme. Needed before the master list seed (phase 2).
- Q19: launch price points for credit packs, seller unlocks and boosts. Needed before phase 5 go live.
- Q23: whether owner account edits need an OTP, and to which number. Needed in phase 6.
- Q1: terms page and disclaimer, since reselling course registrations may conflict with university
  policy. Product and legal decision, not technical.

## Next steps

1. Phase 0: scaffold the Next.js app, Tailwind white theme, UI kit, responsive shell with the
   mobile bottom nav, Prisma and Supabase wiring.
2. Phase 1: phone and OTP auth on the mock provider, with the APITxt adapter ready to receive
   credentials.
3. Phase 2 needs Q16 and Q18 answered before the seed script.
4. Keep `TASKS.md` statuses current and update this file after every completed prompt.
