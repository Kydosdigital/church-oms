# Database rules

- All schema, RLS, and RPC changes are migrations under `supabase/migrations/`,
  applied in strict numeric order, never edited after they've been applied to
  a real environment. A change to already-shipped behaviour is a new
  migration (`00NN_description.sql`), not an edit to an old one. See
  `docs/ARCHITECTURE.md` for the current migration history (0001–0011) and
  what each one is responsible for.
- RLS is the actual authorization boundary, not the UI. Any new table needs
  RLS enabled and a policy before it ships — "we'll add the policy later"
  is how migration 0011's gap happened (unrestricted column-level UPDATE
  on `app_users` despite a row-scoped policy). Column-level grants and
  row-level policies are different mechanisms; check both.
- Any new `SECURITY DEFINER` function must pin `search_path` explicitly and
  have its `EXECUTE` grant reviewed — revoke from `PUBLIC`/`anon` and grant
  only to `authenticated` (or to no one, if it's meant to be reachable only
  from the service-role client, like `provision_new_church`).
- The submit → verify → lock workflow (`0003_functions.sql`) is the pattern
  for any new record type that needs sign-off: a `submit_*` RPC stamps
  submitter + timestamp + version; a `verify_*` RPC checks the caller is
  not the submitter before locking; `return_*` sends it back to draft with
  a required reason; `reopen_*` unlocks a verified record with a required
  reason. Keep attendance and finance's RPCs symmetric — a fix to one
  should usually be mirrored in the other unless there's a stated reason
  not to.
- Finance visibility runs on two independent flags on `user_roles`:
  `finance_permission` and `finance_history_permission`. Neither is implied
  by `is_administrator` or any role name. Don't add a shortcut that lets an
  admin see money without the flag — that's the specific gap this model
  exists to close.
- Regenerate `src/types/database.ts` after any schema change:
  `npx supabase gen types typescript --project-id comxrhbasewjxraejjyl > src/types/database.ts`
  (or via the Supabase MCP's `generate_typescript_types`). A schema change
  without a regenerated types file will compile against stale types.
- Run `mcp__Supabase__get_advisors` (security + performance) after applying
  a migration to a real project before considering the change done.
