-- Adds a second, independent finance flag: finance_permission still governs
-- whether someone can enter/submit/verify offerings for a service at all;
-- finance_history_permission additionally governs whether they can browse
-- *other* services' amounts, dashboards/trends, and financial exports. A
-- treasurer with finance_permission but not finance_history_permission can
-- still enter the current service's offering, see its own submitted/returned
-- state, and correct it if returned — they just can't see previous services'
-- totals, other people's entries, or aggregate reports.
--
-- Defaults to true so existing finance users keep exactly the access they
-- have today; an administrator opts a specific user out of history access
-- from the Users & roles screen going forward.

alter table user_roles add column if not exists finance_history_permission boolean not null default true;

create or replace function has_finance_history_permission(p_branch_id uuid default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.finance_permission = true
      and ur.finance_history_permission = true
      and (ur.branch_id is null or p_branch_id is null or ur.branch_id = p_branch_id)
  );
$$;

-- New function in the public schema — per 0006, default privileges no longer
-- auto-grant anon/authenticated EXECUTE, so grant explicitly. Needed by
-- authenticated because RLS policies evaluate as the querying role (0007).
revoke execute on function has_finance_history_permission(uuid) from anon, authenticated;
grant execute on function has_finance_history_permission(uuid) to authenticated;

-- Tighten revenue_select: full visibility only with history permission.
-- Without it, a finance-permitted user sees only:
--   - their own entries that aren't verified yet (their current/returned work), or
--   - entries pending THEIR verification (finance_verifier, state = submitted).
-- Once an entry is verified it becomes "previous service" data and drops out
-- of view for anyone lacking history permission, per the requirement that
-- such a user cannot see previous amounts or other users' entries.
drop policy if exists revenue_select on revenue_entries;
create policy revenue_select on revenue_entries for select
  using (
    programme_id in (
      select p.id from programme_occurrences p
      where p.branch_id in (select user_branch_ids())
    )
    and has_finance_permission()
    and (
      has_finance_history_permission()
      or (created_by = (select auth.uid()) and state <> 'verified')
      or (has_role('finance_verifier') and state = 'submitted')
    )
  );
