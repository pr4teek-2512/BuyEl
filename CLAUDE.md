# BuyEl

Next.js App Router, Prisma, Tailwind v4. See `Plan.md` for the running context and
`PROJECT_PLAN.md` for the PRD.

## Commands

- `npm run dev` - dev server on port 3000
- `npm run typecheck` / `npm run lint`
- `npm test` - vitest unit tests
- `npm run test:e2e` - Playwright, runs against the dev server and the seeded test accounts

## Popups

Every popup in the app renders through `src/components/ui/Modal.tsx`. Never write a
`fixed inset-0` overlay anywhere else.

A popup is a rounded box floating in the middle of the screen at every width, phones
included. It is never a sheet attached to the bottom or any other edge, and it never has
square corners on one side. `Modal` already handles the centring, the backdrop, the max
height with its own scrolling, the Escape key and the close button, so a new popup only
passes `title`, an optional `description`, `onClose` and its content.

Buttons that sit side by side in a popup footer get `className="flex-1"` so they are the
same width, with the confirming action on the left and the dismissing one on the right.
