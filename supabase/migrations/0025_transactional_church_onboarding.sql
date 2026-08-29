-- Church OMS
-- Migration 0025: transactional church onboarding.
--
-- Public signup remains the intentional path for a prospective church owner.
-- This migration changes only the *inside* of the onboarding transaction:
-- church/default records, owner attachment and first roles now succeed or fail
-- together instead of leaving a partially-created tenant.

create or replace function public.complete_church_onboarding(
  p_user_id uuid,
  p_name text,
  p_currency text default 'USD',
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.app_users%rowtype;
  v_church_id uuid;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Church name is required';
  end if;
  if p_currency is null or length(trim(p_currency)) <> 3 then
    raise exception 'Currency must be a 3-letter code';
  end if;
  if p_timezone is null or length(trim(p_timezone)) = 0 then
    raise exception 'Timezone is required';
  end if;

  -- Serialize repeated/double submissions for this owner. The second caller
  -- waits for the first and then sees church_id already populated.
  select *
    into v_profile
    from public.app_users
   where id = p_user_id
   for update;

  if not found then
    raise exception 'User profile not found';
  end if;
  if not v_profile.active then
    raise exception 'Inactive users cannot create a church';
  end if;
  if v_profile.church_id is not null then
    raise exception 'This user is already attached to a church';
  end if;

  -- provision_new_church creates the church, main branch, venue, default
  -- service types and default offering categories. Because this call is inside
  -- the same PostgreSQL transaction, every record below rolls back as one unit
  -- if any later owner/role step fails.
  v_church_id := public.provision_new_church(
    trim(p_name),
    upper(trim(p_currency)),
    trim(p_timezone)
  );

  update public.app_users
     set church_id = v_church_id
   where id = p_user_id;

  -- Super Admin is church-wide and has full finance visibility. Keep the
  -- Administrator companion role because existing admin checks intentionally
  -- treat Super Admin as a strict superset of the normal administration path.
  insert into public.user_roles (
    user_id,
    role,
    branch_id,
    finance_permission,
    finance_history_permission
  )
  values
    (
      p_user_id,
      'administrator'::public.app_role,
      null,
      false,
      false
    ),
    (
      p_user_id,
      'super_admin'::public.app_role,
      null,
      true,
      true
    );

  return v_church_id;
end;
$$;

-- This RPC is deliberately server-only. The onboarding server action first
-- proves the signed-in auth user and then calls this through the service-role
-- client. End-user clients must not be able to nominate an arbitrary user id.
revoke all on function public.complete_church_onboarding(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_church_onboarding(uuid, text, text, text)
  to service_role;
