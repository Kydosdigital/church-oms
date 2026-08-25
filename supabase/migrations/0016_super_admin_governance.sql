-- Church OMS
-- Migration 0016: church-level Super Admin governance.
--
-- Super Admin is tenant-scoped, not a platform-owner role. It is the highest
-- authority inside one church. A senior pastor may hold both `pastor` and
-- `super_admin`. Only an existing Super Admin may grant/revoke Super Admin.

-- Super Admins are always church-wide and always have complete finance
-- visibility. Enforce this in PostgreSQL, not only in the UI.
alter table public.user_roles
  drop constraint if exists user_roles_super_admin_full_access;

alter table public.user_roles
  add constraint user_roles_super_admin_full_access
  check (
    role <> 'super_admin'::public.app_role
    or (
      branch_id is null
      and finance_permission = true
      and finance_history_permission = true
    )
  );

-- The original UNIQUE(user_id, role, branch_id) permits duplicate NULL branch
-- rows because NULL values are distinct. Prevent duplicate church-wide roles.
create unique index if not exists ux_user_roles_churchwide_role
  on public.user_roles(user_id, role)
  where branch_id is null;

create or replace function public.is_super_admin()
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
      and ur.role = 'super_admin'::public.app_role
      and u.active = true
  );
$$;

-- Everywhere that previously required an Administrator should also accept a
-- Super Admin. This keeps all existing admin RLS policies working unchanged.
create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or public.has_role('administrator'::public.app_role);
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;
revoke all on function public.is_administrator() from public;
grant execute on function public.is_administrator() to authenticated;

-- Administrators may continue to manage ordinary roles, but only a Super
-- Admin may create, edit or remove another Super Admin assignment.
drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write on public.user_roles
for all
using (
  exists (
    select 1
    from public.app_users u
    where u.id = user_roles.user_id
      and u.church_id = public.current_church_id()
  )
  and (
    public.is_super_admin()
    or (
      public.has_role('administrator'::public.app_role)
      and user_roles.role <> 'super_admin'::public.app_role
    )
  )
)
with check (
  exists (
    select 1
    from public.app_users u
    where u.id = user_roles.user_id
      and u.church_id = public.current_church_id()
  )
  and (
    public.is_super_admin()
    or (
      public.has_role('administrator'::public.app_role)
      and user_roles.role <> 'super_admin'::public.app_role
    )
  )
);

-- Never allow a church to accidentally remove its final active Super Admin.
create or replace function public.prevent_last_super_admin_role_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_id uuid;
begin
  if old.role <> 'super_admin'::public.app_role then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.role = 'super_admin'::public.app_role
     and new.user_id = old.user_id then
    return new;
  end if;

  select u.church_id into v_church_id
  from public.app_users u
  where u.id = old.user_id;

  if v_church_id is not null and not exists (
    select 1
    from public.user_roles ur
    join public.app_users u on u.id = ur.user_id
    where ur.role = 'super_admin'::public.app_role
      and u.church_id = v_church_id
      and u.active = true
      and ur.id <> old.id
  ) then
    raise exception 'A church must have at least one active Super Admin';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_last_super_admin_role_removal() from public, anon, authenticated;

drop trigger if exists trg_prevent_last_super_admin_role_removal on public.user_roles;
create trigger trg_prevent_last_super_admin_role_removal
before update or delete on public.user_roles
for each row execute function public.prevent_last_super_admin_role_removal();

-- Deactivating the last Super Admin would create the same lockout, so guard
-- the app_users active flag too.
create or replace function public.prevent_last_super_admin_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.active = true
     and new.active = false
     and exists (
       select 1 from public.user_roles ur
       where ur.user_id = old.id
         and ur.role = 'super_admin'::public.app_role
     )
     and not exists (
       select 1
       from public.user_roles ur
       join public.app_users u on u.id = ur.user_id
       where ur.role = 'super_admin'::public.app_role
         and u.church_id = old.church_id
         and u.active = true
         and u.id <> old.id
     ) then
    raise exception 'A church must have at least one active Super Admin';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_last_super_admin_deactivation() from public, anon, authenticated;

drop trigger if exists trg_prevent_last_super_admin_deactivation on public.app_users;
create trigger trg_prevent_last_super_admin_deactivation
before update of active on public.app_users
for each row execute function public.prevent_last_super_admin_deactivation();
