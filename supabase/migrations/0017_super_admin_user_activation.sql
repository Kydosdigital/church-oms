-- Church OMS
-- Migration 0017: secure activation/deactivation of church users.
--
-- `app_users.active` is intentionally not directly writable by authenticated
-- clients. Use this RPC instead so the original signed-in actor remains known
-- to PostgreSQL and Super Admin accounts cannot be disabled by ordinary admins.

create or replace function public.set_church_user_active(
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_church_id uuid;
  v_target_is_super_admin boolean;
begin
  if not public.is_administrator() then
    raise exception 'Only administrators can manage users';
  end if;

  select u.church_id into v_target_church_id
  from public.app_users u
  where u.id = p_user_id;

  if v_target_church_id is null
     or v_target_church_id <> public.current_church_id() then
    raise exception 'User is not in your church';
  end if;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user_id
      and ur.role = 'super_admin'::public.app_role
  ) into v_target_is_super_admin;

  if v_target_is_super_admin and not public.is_super_admin() then
    raise exception 'Only a Super Admin can change another Super Admin account';
  end if;

  update public.app_users
  set active = p_active,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.set_church_user_active(uuid, boolean) from public;
grant execute on function public.set_church_user_active(uuid, boolean) to authenticated;

-- Tighten the trigger added in 0016. Any deactivation of a Super Admin must
-- originate from another signed-in Super Admin. The existing final-Super-Admin
-- check remains as an additional lockout safeguard.
create or replace function public.prevent_last_super_admin_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_is_super_admin boolean;
begin
  if old.active = new.active then
    return new;
  end if;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = old.id
      and ur.role = 'super_admin'::public.app_role
  ) into v_target_is_super_admin;

  if v_target_is_super_admin and not public.is_super_admin() then
    raise exception 'Only a Super Admin can change another Super Admin account';
  end if;

  if old.active = true
     and new.active = false
     and v_target_is_super_admin
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
