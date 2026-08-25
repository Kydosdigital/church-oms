-- Church Operations Management System
-- Migration 0005: Security hardening (addresses Supabase advisor findings)
--   * programme_guest_ministers had RLS enabled with no policy (unusable, not
--     insecure, but should still be explicit)
--   * set_updated_at() lacked a pinned search_path
--   * all SECURITY DEFINER functions were callable by anon/public — none of
--     them should be reachable by unauthenticated requests

-- ----------------------------------------------------------------------------
-- programme_guest_ministers policies (same visibility as the parent programme)
-- ----------------------------------------------------------------------------

create policy programme_guest_ministers_select on programme_guest_ministers for select
  using (
    programme_id in (select id from programme_occurrences where branch_id in (select user_branch_ids()))
  );

create policy programme_guest_ministers_write on programme_guest_ministers for all
  using (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and state in ('draft', 'returned')
        and created_by = auth.uid()
    )
  )
  with check (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Pin search_path on the trigger helper (was missing it)
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Lock down SECURITY DEFINER functions: revoke from PUBLIC (which includes
-- anon), grant only to authenticated. Every one of these functions relies on
-- auth.uid() and is meaningless (or should be unreachable) for anonymous
-- requests.
-- ----------------------------------------------------------------------------

revoke all on function current_church_id() from public;
revoke all on function user_branch_ids(app_role) from public;
revoke all on function has_role(app_role, uuid) from public;
revoke all on function is_administrator() from public;
revoke all on function has_finance_permission(uuid) from public;
revoke all on function submit_attendance(uuid, integer) from public;
revoke all on function verify_attendance(uuid, integer) from public;
revoke all on function return_attendance(uuid, integer, text) from public;
revoke all on function reopen_attendance(uuid, text) from public;
revoke all on function submit_finance(uuid) from public;
revoke all on function verify_finance(uuid) from public;
revoke all on function return_finance(uuid, text) from public;
revoke all on function reopen_finance(uuid, text) from public;
revoke all on function provision_new_church(text, text, text) from public;
revoke all on function handle_new_auth_user() from public;

grant execute on function current_church_id() to authenticated;
grant execute on function user_branch_ids(app_role) to authenticated;
grant execute on function has_role(app_role, uuid) to authenticated;
grant execute on function is_administrator() to authenticated;
grant execute on function has_finance_permission(uuid) to authenticated;
grant execute on function submit_attendance(uuid, integer) to authenticated;
grant execute on function verify_attendance(uuid, integer) to authenticated;
grant execute on function return_attendance(uuid, integer, text) to authenticated;
grant execute on function reopen_attendance(uuid, text) to authenticated;
grant execute on function submit_finance(uuid) to authenticated;
grant execute on function verify_finance(uuid) to authenticated;
grant execute on function return_finance(uuid, text) to authenticated;
grant execute on function reopen_finance(uuid, text) to authenticated;
-- provision_new_church is a platform/onboarding operation, not an end-user
-- one — no role needs direct client-side access to it. Call it via the
-- service role from server-side onboarding code only.
-- handle_new_auth_user() is only ever invoked by the auth.users trigger,
-- never called directly, so no role needs EXECUTE on it at all.
