-- Supabase's default privileges grant EXECUTE on every new function in the
-- public schema to anon and authenticated automatically (ALTER DEFAULT
-- PRIVILEGES), which is why "revoke ... from public" alone did not remove
-- anon/authenticated's explicit grants in migration 0005. Revoke explicitly
-- from both roles, then re-grant authenticated only where an end user is
-- meant to call the function directly.

revoke execute on function current_church_id() from anon, authenticated;
revoke execute on function user_branch_ids(app_role) from anon, authenticated;
revoke execute on function has_role(app_role, uuid) from anon, authenticated;
revoke execute on function is_administrator() from anon, authenticated;
revoke execute on function has_finance_permission(uuid) from anon, authenticated;
revoke execute on function submit_attendance(uuid, integer) from anon, authenticated;
revoke execute on function verify_attendance(uuid, integer) from anon, authenticated;
revoke execute on function return_attendance(uuid, integer, text) from anon, authenticated;
revoke execute on function reopen_attendance(uuid, text) from anon, authenticated;
revoke execute on function submit_finance(uuid) from anon, authenticated;
revoke execute on function verify_finance(uuid) from anon, authenticated;
revoke execute on function return_finance(uuid, text) from anon, authenticated;
revoke execute on function reopen_finance(uuid, text) from anon, authenticated;
revoke execute on function provision_new_church(text, text, text) from anon, authenticated;
revoke execute on function handle_new_auth_user() from anon, authenticated;
revoke execute on function set_updated_at() from anon, authenticated;

grant execute on function submit_attendance(uuid, integer) to authenticated;
grant execute on function verify_attendance(uuid, integer) to authenticated;
grant execute on function return_attendance(uuid, integer, text) to authenticated;
grant execute on function reopen_attendance(uuid, text) to authenticated;
grant execute on function submit_finance(uuid) to authenticated;
grant execute on function verify_finance(uuid) to authenticated;
grant execute on function return_finance(uuid, text) to authenticated;
grant execute on function reopen_finance(uuid, text) to authenticated;

-- current_church_id / user_branch_ids / has_role / is_administrator /
-- has_finance_permission are internal helpers used *inside* RLS policies —
-- policies run with the privileges needed to evaluate regardless of direct
-- EXECUTE grants on the helper functions themselves, so no role needs direct
-- RPC access to them. provision_new_church and handle_new_auth_user are
-- platform/trigger-only operations — call provision_new_church with the
-- service role from trusted server-side onboarding code only.

-- Ensure no future function in this schema gets an automatic anon/authenticated
-- EXECUTE grant unless explicitly given one.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
