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
