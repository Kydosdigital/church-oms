-- Church OMS
-- Migration 0029: explicit church locale for regional date/number formatting.
--
-- The app previously hard-coded en-GB in several places because churches only
-- stored currency and timezone. Neither is a reliable proxy for a user's
-- country/region. Add an explicit BCP 47-style locale setting and extend the
-- transactional onboarding RPC so new churches can choose it at setup.

alter table public.churches
  add column if not exists locale_code text not null default 'en-GB';

alter table public.churches
  drop constraint if exists churches_locale_code_format_check;

alter table public.churches
  add constraint churches_locale_code_format_check
  check (
    locale_code ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
  );

create or replace function public.complete_church_onboarding(
  p_user_id uuid,
  p_name text,
  p_currency text,
  p_timezone text,
  p_locale text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.app_users%rowtype;
  v_church_id uuid;
  v_locale text := btrim(coalesce(p_locale, ''));
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
  if v_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then
    raise exception 'Locale is invalid';
  end if;

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

  v_church_id := public.provision_new_church(
    trim(p_name),
    upper(trim(p_currency)),
    trim(p_timezone)
  );

  update public.churches
     set locale_code = v_locale
   where id = v_church_id;

  update public.app_users
     set church_id = v_church_id
   where id = p_user_id;

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

-- Keep the existing four-argument server RPC as a compatibility wrapper so an
-- in-flight older deployment can still complete onboarding while the app
-- rollout catches up.
create or replace function public.complete_church_onboarding(
  p_user_id uuid,
  p_name text,
  p_currency text default 'USD',
  p_timezone text default 'UTC'
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.complete_church_onboarding(
    p_user_id,
    p_name,
    p_currency,
    p_timezone,
    'en-GB'
  );
$$;

revoke all on function public.complete_church_onboarding(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_church_onboarding(uuid, text, text, text, text)
  to service_role;

revoke all on function public.complete_church_onboarding(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_church_onboarding(uuid, text, text, text)
  to service_role;
