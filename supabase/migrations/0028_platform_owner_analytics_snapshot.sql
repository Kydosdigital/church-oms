-- Church OMS
-- Migration 0028: scalable Platform Owner analytics snapshot.
--
-- Platform Owner analytics previously fetched every church, user, branch,
-- programme and role through the service-role client, then counted them in
-- application memory. That works for a tiny pilot but scales poorly and moves
-- more cross-tenant personal data than the dashboard actually needs.
--
-- This server-only RPC performs aggregation inside PostgreSQL and returns only
-- the dashboard projection: totals, daily growth, recent churches and recent
-- accounts. It is executable by service_role only. Browser clients never get
-- cross-tenant SQL access.

create or replace function public.platform_owner_dashboard_snapshot(
  p_days integer default 30,
  p_church_limit integer default 50,
  p_account_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(7, least(coalesce(p_days, 30), 90));
  v_church_limit integer := greatest(1, least(coalesce(p_church_limit, 50), 200));
  v_account_limit integer := greatest(1, least(coalesce(p_account_limit, 25), 100));
  v_totals jsonb;
  v_growth jsonb;
  v_churches jsonb;
  v_recent_accounts jsonb;
begin
  select jsonb_build_object(
    'churches', (select count(*)::integer from public.churches),
    'churches_last_7_days', (
      select count(*)::integer
      from public.churches
      where created_at >= now() - interval '7 days'
    ),
    'users', (select count(*)::integer from public.app_users),
    'active_users', (
      select count(*)::integer
      from public.app_users
      where active = true
    ),
    'awaiting_church_setup', (
      select count(*)::integer
      from public.app_users
      where church_id is null
    ),
    'branches', (
      select count(*)::integer
      from public.branches
      where active = true
    ),
    'programmes', (
      select count(*)::integer
      from public.programme_occurrences
    ),
    'active_churches_30_days', (
      select count(distinct church_id)::integer
      from public.programme_occurrences
      where created_at >= now() - interval '30 days'
    )
  )
  into v_totals;

  with days as (
    select generate_series(
      current_date - (v_days - 1),
      current_date,
      interval '1 day'
    )::date as day
  ),
  church_daily as (
    select created_at::date as day, count(*)::integer as count
    from public.churches
    where created_at >= current_date - (v_days - 1)
    group by created_at::date
  ),
  user_daily as (
    select created_at::date as day, count(*)::integer as count
    from public.app_users
    where created_at >= current_date - (v_days - 1)
    group by created_at::date
  ),
  programme_daily as (
    select created_at::date as day, count(*)::integer as count
    from public.programme_occurrences
    where created_at >= current_date - (v_days - 1)
    group by created_at::date
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', d.day,
        'churches', coalesce(c.count, 0),
        'accounts', coalesce(u.count, 0),
        'programmes', coalesce(p.count, 0)
      )
      order by d.day
    ),
    '[]'::jsonb
  )
  into v_growth
  from days d
  left join church_daily c on c.day = d.day
  left join user_daily u on u.day = d.day
  left join programme_daily p on p.day = d.day;

  with recent_churches as (
    select
      c.id,
      c.name,
      c.currency_code,
      c.timezone,
      c.created_at
    from public.churches c
    order by c.created_at desc
    limit v_church_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'currency_code', c.currency_code,
        'timezone', c.timezone,
        'created_at', c.created_at,
        'user_count', (
          select count(*)::integer
          from public.app_users u
          where u.church_id = c.id
        ),
        'active_user_count', (
          select count(*)::integer
          from public.app_users u
          where u.church_id = c.id
            and u.active = true
        ),
        'branch_count', (
          select count(*)::integer
          from public.branches b
          where b.church_id = c.id
            and b.active = true
        ),
        'programme_count', (
          select count(*)::integer
          from public.programme_occurrences p
          where p.church_id = c.id
        ),
        'latest_programme_at', (
          select max(p.created_at)
          from public.programme_occurrences p
          where p.church_id = c.id
        ),
        'super_admins', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'full_name', u.full_name,
                'email', u.email
              )
              order by u.full_name
            )
            from public.user_roles ur
            join public.app_users u on u.id = ur.user_id
            where u.church_id = c.id
              and ur.role = 'super_admin'::public.app_role
          ),
          '[]'::jsonb
        )
      )
      order by c.created_at desc
    ),
    '[]'::jsonb
  )
  into v_churches
  from recent_churches c;

  with recent_users as (
    select
      u.id,
      u.full_name,
      u.email,
      u.active,
      u.created_at,
      u.church_id
    from public.app_users u
    order by u.created_at desc
    limit v_account_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'email', u.email,
        'active', u.active,
        'created_at', u.created_at,
        'church_id', u.church_id,
        'church_name', c.name
      )
      order by u.created_at desc
    ),
    '[]'::jsonb
  )
  into v_recent_accounts
  from recent_users u
  left join public.churches c on c.id = u.church_id;

  return jsonb_build_object(
    'totals', v_totals,
    'growth', v_growth,
    'churches', v_churches,
    'recent_accounts', v_recent_accounts
  );
end;
$$;

revoke all on function public.platform_owner_dashboard_snapshot(integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.platform_owner_dashboard_snapshot(integer, integer, integer)
  to service_role;
