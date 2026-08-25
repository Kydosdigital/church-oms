# Church OMS — Architecture

## Stack

Next.js 16 (App Router, Turbopack, React 19.2) on Vercel, talking to a single
Supabase project (Postgres + Auth + Row-Level Security). No separate backend
service — almost all business logic lives in Postgres (RLS policies and
`SECURITY DEFINER` RPCs), with server actions/route handlers as thin callers.

## Routing and session handling

- Route groups: `src/app/(auth)/` (login, forgot-password, reset-password,
  auth confirm) and `src/app/(app)/` (everything behind a signed-in session —
  dashboard, programme entry, admin, help, audit).
- `src/app/(app)/layout.tsx` redirects a signed-in user with no `church_id`
  to `/onboarding`, so a brand-new account never renders a broken shell.
- `proxy.ts` (Next.js 16's renamed `middleware.ts` convention) plus
  `src/lib/supabase/middleware.ts` refresh the Supabase session cookie on
  every request and redirect signed-out users away from `(app)` routes.
- Three separate Supabase client constructors, each scoped to where it's
  safe to use:
  - `src/lib/supabase/client.ts` — browser client, anon key.
  - `src/lib/supabase/server.ts` — server components/actions, anon key,
    cookie-bound to the current user (so RLS applies as that user).
  - `src/lib/supabase/admin.ts` — service-role client, server-only, used
    for the small number of operations that must bypass RLS by design
    (inviting a user via `auth.admin`, `provision_new_church`, setting
    `church_id`/`active` on `app_users`). Never imported into anything
    that ships to the browser.

## Authorization: RLS is the boundary, not the UI

Every table's row access is enforced by Postgres RLS policies
(`supabase/migrations/0002_rls_policies.sql`), scoped by `church_id` and,
where relevant, by branch assignment. The UI hides controls a user
shouldn't see, but the actual enforcement — which rows can be read/written,
which columns can be updated, which RPCs can be called — is server-side and
holds even if a request bypasses the UI entirely.

`src/lib/permissions.ts` centralizes the client-side mirror of these rules
(`isAdministrator`, `hasFinancePermission`, `hasFinanceHistoryPermission`,
`usherBranchScope`, `canVerifyAttendance`, `canVerifyFinance`) so every
screen makes the same decision the database would, without duplicating the
logic per component. It is a convenience layer for good UX, not the source
of truth.

Two examples of privilege boundaries enforced below the UI:
- Migration `0011` revokes unrestricted `UPDATE` on `app_users` from
  `authenticated` and grants back only the `full_name` column — a signed-in
  user cannot change their own `church_id` or `active` flag through a normal
  client update, regardless of what the UI exposes. Those fields are only
  ever set via the service-role client after an explicit application-level
  check (`src/lib/data/admin.ts`, `src/app/onboarding/actions.ts`).
- `provision_new_church` (used by onboarding) has no `authenticated` EXECUTE
  grant at all; it's only callable from the service-role client, after the
  calling code has already verified the user has no existing `church_id`.

## The submit → verify → lock workflow

Implemented identically for attendance and finance as a set of
`SECURITY DEFINER` RPCs in `supabase/migrations/0003_functions.sql`:

- `submit_attendance` / `submit_revenue` — moves a draft to `submitted`,
  stamping `submitted_by` + `submitted_at` + the row's version.
- `verify_attendance` / `verify_revenue` — moves `submitted` to `verified`
  (locked), but only if the caller is not the same user who submitted it —
  this check runs inside the function itself, so it can't be bypassed by
  calling the RPC directly.
- `return_attendance` / `return_revenue` — sends a submitted record back to
  `draft` with a required reason, for correction and resubmission.
- `reopen_attendance` / `reopen_revenue` — unlocks a verified record given
  the right permission and a required reason; the reason and the state
  transition are both written to `audit_events`.

Every transition is additionally recorded in the `audit_events` table
(surfaced to admins at `/admin/audit`), independent of the columns on the
record itself, so the history survives even a later reopen/resubmit cycle.

## Finance visibility

`user_roles` carries two independent boolean flags, `finance_permission`
and `finance_history_permission` (added in migrations `0009`–`0010`).
Neither is implied by role or by `is_administrator` — an admin who wants to
see money has to be explicitly granted it, same as anyone else. The RLS
policy on `revenue_entries` (`revenue_select`) checks these flags directly:
without `finance_history_permission`, a query can only return the caller's
own current (not-yet-verified) entry or one pending their own verification —
never another service's amount or another user's entry, and never through a
dashboard/export code path that happens to query more broadly.

## Migration history

`supabase/migrations/` is applied in numeric order and is the single source
of truth for schema, RLS, and RPCs:

1. `0001_core_schema.sql` — churches, branches, venues, service types,
   `app_users`/`user_roles`, programme occurrences, attendance, offering
   categories, revenue entries, sign-off columns, `audit_events`.
2. `0002_rls_policies.sql` — branch-scoped access, explicit finance
   permission, locked/verified-record write protection.
3. `0003_functions.sql` — the submit/verify/return/reopen RPCs.
4. `0004_seed_defaults.sql` — `provision_new_church(...)` for onboarding.
5. `0005`–`0008` — advisor-driven hardening: RLS on join tables, pinned
   `search_path` on every `SECURITY DEFINER` function, `EXECUTE` grants
   restricted to `authenticated` only where intended, missing FK indexes,
   re-evaluated `auth.uid()` per row rather than per statement.
6. `0009`–`0010` — `finance_history_permission` on `user_roles`; tightened
   `revenue_select` to the scope described above.
7. `0011_restrict_app_users_self_update.sql` — column-level privilege fix
   described above.

Regenerate `src/types/database.ts` after any schema change:

```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```

## Tests

Vitest (`vitest.config.mts`), tests colocated under top-level `tests/`
rather than beside their source files, importing via the `@/` alias
(`@/lib/calculations`, `@/lib/permissions`, `@/lib/validations/programme`)
rather than relative paths. Run with `npm test` / `npx vitest run`. Current
coverage: attendance/finance calculation helpers, the client-side
permission-mirroring logic (including branch scoping and the finance-history
flag), and the programme-entry Zod schema (SRV-08 override, negative-count
rejection, missing-branch rejection).
