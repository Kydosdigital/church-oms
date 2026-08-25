-- Church Operations Management System
-- Migration 0011: closes a self-service privilege escalation gap on app_users.
--
-- app_users_update_self (0002_rls_policies.sql) is row-scoped only
-- (id = auth.uid()) — it never restricted which COLUMNS a user could change
-- on their own row. Since Postgres/Supabase had granted `authenticated`
-- unrestricted UPDATE on every column, a signed-in user could change their
-- own church_id (hop into another tenant) or active flag via a normal
-- client update, RLS notwithstanding. RLS restricts rows, not columns.
--
-- Column-level privilege now limits self-service updates to full_name only.
-- church_id and active are set exclusively via the service-role client
-- (see src/lib/supabase/admin.ts) after an explicit application-level check
-- (onboarding's own-church-only provisioning; requireAdministrator() for
-- setUserActive) — see src/lib/data/admin.ts and src/app/onboarding/actions.ts.
revoke update on app_users from authenticated;
grant update (full_name) on app_users to authenticated;
