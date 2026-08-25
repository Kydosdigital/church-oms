# Security rules

- Never read, print, or commit `.env`, `.env.local`, or any file containing
  `SUPABASE_SERVICE_ROLE_KEY`. The service-role key bypasses RLS entirely —
  treat it like a root database password. It must never carry a
  `NEXT_PUBLIC_` prefix and must never be imported into anything that
  ships to the browser (see `src/lib/supabase/admin.ts`'s own comment).
- Separation of duties (a person can't verify their own submission) is
  enforced inside the `verify_attendance`/`verify_revenue` RPCs themselves,
  not only in the UI. Never "simplify" a screen by removing the disabled
  state on a verify button for the submitter — the server would reject the
  call anyway, but the UI should say why.
- Column-level privilege matters as much as row-level: before granting a
  table broad `UPDATE`/`INSERT` to `authenticated`, check whether every
  column on that row should really be user-writable (migration 0011 is the
  precedent — `app_users.church_id` and `app_users.active` are
  intentionally NOT in `authenticated`'s grant).
- Branding assets and Vercel project environment variables are explicitly
  out of scope for Claude to manage in this repo — they're owned directly
  by the client/user. Don't modify Vercel env vars or overwrite incoming
  branding files without being asked.
- Before staging/committing, review `git status` for anything that looks
  like it could carry a secret (env files, downloaded key material) even
  if the filename looks innocuous, and check its contents before it goes
  into a commit.
- Audit every submit/verify/return/reopen transition to `audit_events` —
  if a new workflow-style feature is added, it should write to this table
  the same way, not introduce a second, untracked history mechanism.
