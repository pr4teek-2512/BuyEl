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
| MSG91 behind an SMS adapter | Cheapest reliable Indian OTP route, swappable in one file |
| Two ordering keys (`normal_order_key` ascending, `boost_order_key` descending) plus one-shot push flags | Expresses all of the PRD sorting rules with a single indexed query and no background job |
| Boost expiry evaluated at read time | No cron dependency, always correct |
| Append only credit ledger with a cached balance | Auditable, prevents double spend under concurrency |
| Unique transaction id across payment requests | Blocks replaying one UPI payment for several unlocks |

## Open questions blocking work

Full list in `PROJECT_PLAN.md` section 9. The blocking ones:

1. Q2 stack approval (Next.js + Supabase + Vercel) or self hosted VPS.
2. Q3 SMS provider ownership, DLT template registration, OTP budget.
3. Q6 one credit per new seller or per listing.
4. Q7 what happens when a buyer chats on a listing whose seller has not unlocked chat.
5. Q19 launch price points for credit packs, unlocks and boosts.

Also flagged, not technical: reselling course registrations may conflict with university policy,
so a terms page and disclaimer are recommended (Q1).

## Next steps

1. Get answers to the five blocking questions above.
2. Start Phase 0 (foundation and UI kit), which only needs Q2 answered.
3. Phase 1 authentication with the mock SMS provider while the DLT registration is pending.
4. Keep `TASKS.md` statuses current and update this file after every completed prompt.
