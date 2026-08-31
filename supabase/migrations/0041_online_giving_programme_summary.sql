-- Church OMS
-- Migration 0041: aggregate online-giving reconciliation totals in PostgreSQL.
--
-- The reconciliation page previously paged every matched transaction and every
-- revenue row into the Next.js server and aggregated them in memory. That made
-- page-load work grow linearly with church history. This RPC keeps the same
-- branch-scoped finance-history authorization and RLS while returning only one row per
-- programme that has recorded or matched online giving.

create or replace function public.online_giving_programme_summary(
  p_branch_id uuid
)
returns table (
  programme_id uuid,
  programme_name text,
  programme_date date,
  finance_state text,
  recorded_online numeric(14,2),
  matched_imported numeric(14,2),
  variance numeric(14,2),
  matched_transaction_count bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_church_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select b.church_id
    into v_church_id
  from public.branches b
  join public.app_users u
    on u.id = v_user_id
   and u.active = true
   and u.church_id = b.church_id
  where b.id = p_branch_id
    and b.active = true;

  if v_church_id is null then
    raise exception 'Branch is not available for this user';
  end if;

  if not private.has_finance_history_permission(p_branch_id)
     or not exists (
       select 1
       from private.user_branch_ids() branch_id
       where branch_id = p_branch_id
     ) then
    raise exception 'Finance-history permission is required for reconciliation';
  end if;

  return query
  with matched as (
    select
      t.matched_programme_id as programme_id,
      sum(t.amount)::numeric(14,2) as matched_imported,
      count(*)::bigint as matched_transaction_count
    from public.online_giving_transactions t
    where t.branch_id = p_branch_id
      and t.church_id = v_church_id
      and t.status = 'matched'
      and t.matched_programme_id is not null
    group by t.matched_programme_id
  ),
  recorded as (
    select
      r.programme_id,
      sum(r.online_amount)::numeric(14,2) as recorded_online
    from public.revenue_entries r
    join public.programme_occurrences p
      on p.id = r.programme_id
    where p.branch_id = p_branch_id
      and p.church_id = v_church_id
    group by r.programme_id
  ),
  programme_ids as (
    select m.programme_id from matched m
    union
    select r.programme_id from recorded r
  )
  select
    p.id as programme_id,
    p.programme_name,
    p.programme_date,
    p.finance_state::text,
    round(coalesce(r.recorded_online, 0), 2)::numeric(14,2) as recorded_online,
    round(coalesce(m.matched_imported, 0), 2)::numeric(14,2) as matched_imported,
    round(
      coalesce(m.matched_imported, 0) - coalesce(r.recorded_online, 0),
      2
    )::numeric(14,2) as variance,
    coalesce(m.matched_transaction_count, 0)::bigint as matched_transaction_count
  from programme_ids i
  join public.programme_occurrences p
    on p.id = i.programme_id
  left join recorded r
    on r.programme_id = p.id
  left join matched m
    on m.programme_id = p.id
  where p.branch_id = p_branch_id
    and p.church_id = v_church_id
  order by p.programme_date desc;
end;
$$;

revoke all on function public.online_giving_programme_summary(uuid)
  from public, anon;
grant execute on function public.online_giving_programme_summary(uuid)
  to authenticated;
