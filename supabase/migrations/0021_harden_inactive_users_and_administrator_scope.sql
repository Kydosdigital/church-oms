-- Church OMS
-- Migration 0021: deny inactive church users at the shared authorization
-- helpers and enforce Administrator as a church-wide role.

-- A deactivated app user may still have a valid Supabase Auth session. Treat
-- active=false as immediate loss of tenant membership for RLS and helper-based
-- RPC authorization, rather than relying on token/session expiry.
create or replace function public.current_church_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.church_id
  from public.app_users u
  where u.id = auth.uid()
    and u.active = true;
$$;

create or replace function public.has_role(
  p_role public.app_role,
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.app_users u on u.id = ur.user_id
    where ur.user_id = auth.uid()
      and u.active = true
      and ur.role = p_role
      and (ur.branch_id is null or p_branch_id is null or ur.branch_id = p_branch_id)
  );
$$;

create or replace function public.has_finance_permission(
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.app_users u on u.id = ur.user_id
    where ur.user_id = auth.uid()
      and u.active = true
      and ur.finance_permission = true
      and (ur.branch_id is null or p_branch_id is null or ur.branch_id = p_branch_id)
  );
$$;

-- Administrator is a church-wide governance role. Branch-scoped administrator
-- rows are misleading because is_administrator() intentionally governs tenant-
-- wide configuration. Prevent creation of that contradictory state.
alter table public.user_roles
  drop constraint if exists user_roles_administrator_churchwide;

alter table public.user_roles
  add constraint user_roles_administrator_churchwide
  check (
    role <> 'administrator'::public.app_role
    or branch_id is null
  );

-- Preserve the existing restricted execution model for shared helpers.
revoke all on function public.current_church_id() from public;
grant execute on function public.current_church_id() to authenticated;
revoke all on function public.has_role(public.app_role, uuid) from public;
grant execute on function public.has_role(public.app_role, uuid) to authenticated;
revoke all on function public.has_finance_permission(uuid) from public;
grant execute on function public.has_finance_permission(uuid) to authenticated;
