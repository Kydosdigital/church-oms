-- Church OMS
-- Migration 0032: move RLS authorization helpers out of the exposed API schema
-- and retire authenticated access to legacy finance workflow overloads.
--
-- Supabase recommends keeping SECURITY DEFINER RLS helper functions in a
-- non-exposed schema. The public compatibility shells below are SECURITY
-- INVOKER and are not executable by authenticated users. They exist only so
-- existing SECURITY DEFINER function bodies that refer to public helper names
-- continue to resolve without a broad rewrite.
--
-- The application uses the version-checked finance workflow signatures, so the
-- older convenience overloads are no longer executable by authenticated users.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated, service_role;

alter function public.current_church_id()
  set schema private;
alter function public.has_finance_history_permission(uuid)
  set schema private;
alter function public.has_finance_permission(uuid)
  set schema private;
alter function public.has_role(public.app_role, uuid)
  set schema private;
alter function public.is_administrator()
  set schema private;
alter function public.is_platform_admin()
  set schema private;
alter function public.is_super_admin()
  set schema private;
alter function public.user_branch_ids(public.app_role)
  set schema private;

revoke all on function private.current_church_id() from public;
revoke all on function private.current_church_id() from anon;
grant execute on function private.current_church_id()
  to authenticated, service_role;

revoke all on function private.has_finance_history_permission(uuid) from public;
revoke all on function private.has_finance_history_permission(uuid) from anon;
grant execute on function private.has_finance_history_permission(uuid)
  to authenticated, service_role;

revoke all on function private.has_finance_permission(uuid) from public;
revoke all on function private.has_finance_permission(uuid) from anon;
grant execute on function private.has_finance_permission(uuid)
  to authenticated, service_role;

revoke all on function private.has_role(public.app_role, uuid) from public;
revoke all on function private.has_role(public.app_role, uuid) from anon;
grant execute on function private.has_role(public.app_role, uuid)
  to authenticated, service_role;

revoke all on function private.is_administrator() from public;
revoke all on function private.is_administrator() from anon;
grant execute on function private.is_administrator()
  to authenticated, service_role;

revoke all on function private.is_platform_admin() from public;
revoke all on function private.is_platform_admin() from anon;
grant execute on function private.is_platform_admin()
  to authenticated, service_role;

revoke all on function private.is_super_admin() from public;
revoke all on function private.is_super_admin() from anon;
grant execute on function private.is_super_admin()
  to authenticated, service_role;

revoke all on function private.user_branch_ids(public.app_role) from public;
revoke all on function private.user_branch_ids(public.app_role) from anon;
grant execute on function private.user_branch_ids(public.app_role)
  to authenticated, service_role;

create function public.current_church_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select private.current_church_id();
$$;

create function public.has_finance_history_permission(
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_finance_history_permission(p_branch_id);
$$;

create function public.has_finance_permission(
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_finance_permission(p_branch_id);
$$;

create function public.has_role(
  p_role public.app_role,
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_role(p_role, p_branch_id);
$$;

create function public.is_administrator()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_administrator();
$$;

create function public.is_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_super_admin();
$$;

create function public.user_branch_ids(
  p_role public.app_role default null
)
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.user_branch_ids(p_role);
$$;

revoke all on function public.current_church_id() from public;
revoke all on function public.current_church_id() from anon;
revoke all on function public.current_church_id() from authenticated;
grant execute on function public.current_church_id() to service_role;

revoke all on function public.has_finance_history_permission(uuid) from public;
revoke all on function public.has_finance_history_permission(uuid) from anon;
revoke all on function public.has_finance_history_permission(uuid)
  from authenticated;
grant execute on function public.has_finance_history_permission(uuid)
  to service_role;

revoke all on function public.has_finance_permission(uuid) from public;
revoke all on function public.has_finance_permission(uuid) from anon;
revoke all on function public.has_finance_permission(uuid)
  from authenticated;
grant execute on function public.has_finance_permission(uuid)
  to service_role;

revoke all on function public.has_role(public.app_role, uuid) from public;
revoke all on function public.has_role(public.app_role, uuid) from anon;
revoke all on function public.has_role(public.app_role, uuid)
  from authenticated;
grant execute on function public.has_role(public.app_role, uuid)
  to service_role;

revoke all on function public.is_administrator() from public;
revoke all on function public.is_administrator() from anon;
revoke all on function public.is_administrator() from authenticated;
grant execute on function public.is_administrator() to service_role;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_platform_admin() from anon;
revoke all on function public.is_platform_admin() from authenticated;
grant execute on function public.is_platform_admin() to service_role;

revoke all on function public.is_super_admin() from public;
revoke all on function public.is_super_admin() from anon;
revoke all on function public.is_super_admin() from authenticated;
grant execute on function public.is_super_admin() to service_role;

revoke all on function public.user_branch_ids(public.app_role) from public;
revoke all on function public.user_branch_ids(public.app_role) from anon;
revoke all on function public.user_branch_ids(public.app_role)
  from authenticated;
grant execute on function public.user_branch_ids(public.app_role)
  to service_role;

revoke all on function public.submit_finance(uuid) from public;
revoke all on function public.submit_finance(uuid) from anon;
revoke all on function public.submit_finance(uuid) from authenticated;
grant execute on function public.submit_finance(uuid) to service_role;

revoke all on function public.verify_finance(uuid) from public;
revoke all on function public.verify_finance(uuid) from anon;
revoke all on function public.verify_finance(uuid) from authenticated;
grant execute on function public.verify_finance(uuid) to service_role;

revoke all on function public.return_finance(uuid, text) from public;
revoke all on function public.return_finance(uuid, text) from anon;
revoke all on function public.return_finance(uuid, text) from authenticated;
grant execute on function public.return_finance(uuid, text)
  to service_role;

revoke all on function public.reopen_finance(uuid, text) from public;
revoke all on function public.reopen_finance(uuid, text) from anon;
revoke all on function public.reopen_finance(uuid, text) from authenticated;
grant execute on function public.reopen_finance(uuid, text)
  to service_role;
