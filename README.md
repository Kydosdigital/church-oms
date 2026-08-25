# Church Operations Management System (Church OMS)

A responsive Next.js + Supabase application implementing the Church Operations
Management System PRD: attendance capture, two-person verification, configurable
offering categories, project fundraising progress, dashboards and permission-
controlled reports.

## Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- **Backend**: Supabase (Postgres, Auth, Row-Level Security)
- **Charts**: Recharts
- **Forms**: react-hook-form + zod

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

## Project docs and Claude Code governance

- `docs/PRODUCT.md` — what this app is, who it's for, the submit → verify →
  lock workflow, and the explicit finance-visibility model.
- `docs/ARCHITECTURE.md` — stack, routing/session handling, the RLS-as-
  authorization-boundary pattern, and the full migration history.
- `.claude/` — Claude Code project governance: `CLAUDE.md` entry point,
  `.mcp.json` (Supabase MCP server for this project), `rules/` (frontend,
  database, security conventions), `agents/` (`code-reviewer`,
  `security-reviewer` subagents), `hooks/` (env-file/secret protection, a
  pre-commit verification reminder), and `skills/` (`build-feature`,
  `review-feature`).
- `tests/` — Vitest specs, colocated at the top level rather than beside
  their source files, importing via the `@/` alias (see
  `vitest.config.mts`). Run with `npm test`.

## Database

All schema, RLS policies and workflow RPCs live in `supabase/migrations/`, applied
in order:

1. `0001_core_schema.sql` — churches, branches, venues, service types, users/roles,
   programme occurrences, attendance, offering categories, revenue entries,
   sign-offs, audit log.
2. `0002_rls_policies.sql` — branch-scoped access, explicit finance permission
   (independent of role/admin status), locked/verified record enforcement.
3. `0003_functions.sql` — SECURITY DEFINER RPCs for submit/verify/return/reopen
   on both attendance and finance, enforcing separation of duties server-side.
4. `0004_seed_defaults.sql` — `provision_new_church(...)` helper for onboarding
   a new tenant with sane defaults (Main Branch, default service types and
   offering categories).
5. `0005_security_hardening.sql`, `0006`–`0008` — advisor-driven hardening
   (RLS on join tables, function search_path, EXECUTE grants restricted to
   `authenticated`, missing FK indexes, per-row `auth.uid()` re-evaluation).
6. `0009_finance_history_permission.sql`, `0010` — adds `finance_history_permission`
   on `user_roles` and tightens `revenue_select` so a finance user without it
   can only see their own current (non-verified) entry or one pending their
   own verification — not other services' amounts or other users' entries.

Regenerate `src/types/database.ts` after any schema change:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

## Branding

`src/app/globals.css` defines every color/spacing/font token as a CSS variable
under a single "BRANDING LAYER" comment block. No component hardcodes a color
or font name. The current palette and Open Sans font were supplied by
21st.dev; to swap branding again, only that file (and, for a different font,
`src/app/layout.tsx`, which loads the font via `next/font/google`) needs to
change. Dark mode currently follows the OS colour-scheme preference — there is
no manual toggle in the UI yet, though the `.dark` class is wired up and ready
for one.

## What's built vs. what's next

Built: auth, branch/role model, programme + attendance entry (phone-first wizard
with live capacity/outcome validation), attendance verification workflow,
revenue entry with configurable offering categories and project progress,
dashboards (attendance + revenue trends, pending approvals, project progress),
CSV exports and a print-ready programme report, and full admin CRUD for
branches/venues/service types and for user roles (including inviting new
users by email).

Inviting a user requires `SUPABASE_SERVICE_ROLE_KEY` to be set server-side
(Project Settings → API → service_role key) — it's the only way to create an
`auth.users` row for someone who hasn't signed up yet. It's deliberately left
out of `.env.example`; without it, `inviteUser` fails with a clear error
instead of silently doing nothing. Never expose this key to the browser
(no `NEXT_PUBLIC_` prefix) — see `src/lib/supabase/admin.ts`.

Also built, from a later round of stakeholder feedback:

- **Branch protection** — the "New programme" form locks the branch field to
  the signed-in usher's own assigned branch(es) instead of a freely editable
  dropdown of every branch in the church (still enforced server-side by RLS
  either way, so this only removes a confusing failure mode, not a real
  vulnerability). The venue list is also filtered to the selected branch.
- **Physical vs. online giving totals** — dashboard cards for total physical
  giving, total online giving, combined, and each as a percentage of the
  whole, for the selected date range.
- **"View past financial records" permission** — a second, independent flag
  (`finance_history_permission`, defaulting to on) alongside `finance_permission`.
  A treasurer without it can still enter/review/correct the current service's
  offering, but can't see previous services' amounts, other users' entries,
  dashboards, trends, or financial exports — enforced in `revenue_select`
  (migrations 0009–0010), not just hidden in the UI.
- **Dashboard date-range picker** — 7/30/90-day, this-year, all-time and
  custom presets (`src/components/dashboard/date-range-control.tsx`), replacing
  the previous hardcoded 90-day window.

Next up: email notifications (section 3.2, "should-have"); splitting the
handful of admin "for all" RLS policies flagged by the Supabase performance
advisor as `multiple_permissive_policies` (cosmetic, not a security issue); a
"service number" field for multiple same-day occurrences of the same service
type; and a possible move from the current men/women/teenagers/children
attendance buckets to a fuller adult/teen/child × male/female breakdown, if
that level of detail turns out to be wanted (raised in passing during
requirements discussion but not in the PRD this app was built from).

## Sign-off round (25 Aug) — everything from the punch list except branding/env

Closing the gap between "working MVP" and "ready for the client":

- **Church onboarding** — a first-run `/onboarding` screen provisions a real
  church (via `provision_new_church`), sets the signed-in user's `church_id`,
  and makes them the first administrator. `(app)/layout.tsx` redirects any
  signed-in user with no church here instead of rendering a broken shell.
  Runs over the service-role client after an RLS-bound check, since
  `provision_new_church` intentionally has no `authenticated` EXECUTE grant.
- **Password reset** — `/forgot-password` requests a reset email
  (`supabase.auth.resetPasswordForEmail`); `/auth/confirm` exchanges the
  email link's token for a session; `/reset-password` sets the new password.
- **SRV-08 duplicate-service warning** — the programme wizard now actually
  checks for an existing occurrence on the same branch/service type/date,
  shows a warning with a required override + reason instead of a raw
  constraint error, and records `duplicate_override`/`duplicate_override_reason`
  on submit (previously a misleading comment claimed this existed; it didn't).
- **Church settings screen** (`/admin/settings`) — currency, timezone,
  reporting-year start month, and independent-verification toggle, backed by
  the `churches_update` RLS policy that already existed.
- **Audit log viewer** (`/admin/audit`) — filterable by table/action/date
  over the previously-invisible `audit_events` table.
- **Excel export** — every CSV report route also accepts `?format=xlsx`
  (`src/lib/xlsx.ts`, via `exceljs`), alongside the existing CSV and
  browser-print options.
- **Error monitoring scaffolding** — `@sentry/nextjs`, wired through
  `src/instrumentation.ts` / `src/instrumentation-client.ts` /
  `sentry.server.config.ts` / `sentry.edge.config.ts` plus a `global-error.tsx`
  boundary. Entirely opt-in: with no `NEXT_PUBLIC_SENTRY_DSN` set, every init
  call is skipped and the app behaves exactly as before.
- **Per-role help guides** (`/help`) and **privacy/terms pages** (`/privacy`,
  `/terms`), linked from the app nav, login and landing pages.
- **Automated tests** — Vitest covers `calculations.ts`, `permissions.ts`
  (including the branch-scoping and finance-history-permission logic), and
  the programme entry validation schema. Run with `npm test`.
- **Accessibility pass** — a skip-to-content link, `aria-current="page"` on
  the active nav item, and a focusable main-content landmark on every layout.
- **Closed a self-service privilege gap**: `authenticated` previously had
  unrestricted column-level UPDATE on `app_users`, so the row-level
  `app_users_update_self` policy didn't actually stop a user from changing
  their own `church_id` or `active` flag. Migration `0011` restricts
  `authenticated`'s UPDATE grant to `full_name` only; anything else
  (`active`, `church_id`) now goes through the service-role client after an
  explicit administrator/onboarding check (see `setUserActive`,
  the onboarding action).

Deliberately left out of this round (owned elsewhere): real branding assets
(favicon/app icon/social image — incoming from another source directly into
the repo) and Vercel project environment variables (the user's own
responsibility). A custom domain is also unaddressed — that's a Vercel
dashboard/DNS action, not a code change.
