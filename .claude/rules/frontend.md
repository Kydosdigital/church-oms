# Frontend rules

- This is Next.js 16, not the Next.js you may have trained on. Before
  touching routing, data fetching, or the middleware/proxy convention, skim
  `AGENTS.md` at the repo root and, if still unsure, the docs under
  `node_modules/next/dist/docs/`. The middleware file is `proxy.ts`, not
  `middleware.ts`.
- Route groups: put anything that requires a signed-in session under
  `src/app/(app)/`; auth screens (login, forgot-password, reset-password,
  the auth confirm callback) go under `src/app/(auth)/`.
- Never hardcode a color, spacing value, or font name in a component.
  `src/app/globals.css` defines every design token as a CSS variable under
  the "BRANDING LAYER" comment block — reference tokens (`bg-background`,
  `text-foreground`, etc.) so re-branding stays a one-file change.
- Dark mode follows the OS preference only (`prefers-color-scheme`); there
  is no manual toggle. Don't add one without being asked — the `.dark`
  class is wired up and ready, but turning it on is a product decision.
- Forms use `react-hook-form` + `zod`; validation schemas live in
  `src/lib/validations/` and should be the single source of truth for both
  client-side and server-action validation (see
  `src/lib/validations/programme.ts` for the pattern, including the SRV-08
  duplicate-override field).
- Every layout keeps the skip-to-content link and a focusable main-content
  landmark; every nav adds `aria-current="page"` to the active item. Don't
  remove these while touching a layout for something unrelated.
- Numeric warnings (capacity exceeded, outcomes exceeding total attendance,
  SRV-08 duplicate service) must degrade to a required explanatory note,
  never a silent accept and never a hard block — that's the established
  UX pattern across the attendance wizard.
- Don't reach for `src/lib/supabase/admin.ts` (the service-role client)
  from anything that could run in or ship to the browser. If a screen
  seems to need it, the real fix is almost always an RLS policy or a
  `SECURITY DEFINER` RPC, not bypassing RLS from the client tier.
