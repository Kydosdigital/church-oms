-- Church OMS
-- Migration 0036: fundraising project entry windows and audited override.
--
-- A project category may accept revenue only for programmes on/after its
-- configured start date and on/before its end date. Entries after the end
-- date require the explicit Administrator-controlled override already present
-- in the schema. Existing revenue rows remain correctable because project
-- window validation is insert-only and revenue rows cannot be moved between
-- programmes or categories.

-- Seeded/legacy project categories predate fundraising_projects rows.
-- Backfill one empty configuration row for each so every project category has
-- a canonical settings record before the window rule starts enforcing.
insert into public.fundraising_projects (category_id)
select c.id
from public.offering_categories c
where c.category_type = 'project'::public.offering_category_type
  and not exists (
    select 1
    from public.fundraising_projects fp
    where fp.category_id = c.id
  );

alter table public.fundraising_projects
  drop constraint if exists fundraising_projects_date_order;

alter table public.fundraising_projects
  add constraint fundraising_projects_date_order
  check (
    start_date is null
    or end_date is null
    or end_date >= start_date
  );

-- Preserve the existing finance-lock and immovable-reference guarantees while
-- adding a precise insert-time project-window check. UPDATE intentionally does
-- not re-run the date-window rule so a historic row that was valid when first
-- recorded can still be corrected if the project later closes.
create or replace function public.guard_revenue_entry_edit()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_finance_state public.record_state;
  v_programme_date date;
  v_category_type public.offering_category_type;
  v_project_id uuid;
  v_start_date date;
  v_end_date date;
  v_after_end_override boolean;
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;

    if new.programme_id is distinct from old.programme_id
       or new.category_id is distinct from old.category_id then
      raise exception
        'A revenue entry cannot be moved to another programme or category';
    end if;

    if new.physical_amount is not distinct from old.physical_amount
       and new.online_amount is not distinct from old.online_amount
       and new.notes is not distinct from old.notes then
      return new;
    end if;
  end if;

  select
    p.finance_state,
    p.programme_date
  into
    v_finance_state,
    v_programme_date
  from public.programme_occurrences p
  where p.id = new.programme_id
  for key share;

  if v_finance_state is null then
    raise exception 'Programme % not found', new.programme_id;
  end if;

  if v_finance_state not in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  ) then
    raise exception
      'Finance entries are locked while finance state is %',
      v_finance_state;
  end if;

  if tg_op = 'INSERT' then
    select
      c.category_type,
      fp.id,
      fp.start_date,
      fp.end_date,
      fp.accepting_entries_after_end_override
    into
      v_category_type,
      v_project_id,
      v_start_date,
      v_end_date,
      v_after_end_override
    from public.offering_categories c
    left join public.fundraising_projects fp
      on fp.category_id = c.id
    where c.id = new.category_id;

    if v_category_type = 'project'::public.offering_category_type then
      if v_project_id is null then
        raise exception
          'Fundraising project configuration is missing for this category';
      end if;

      if v_start_date is not null
         and v_programme_date < v_start_date then
        raise exception
          'This fundraising project is not accepting entries before %',
          v_start_date;
      end if;

      if v_end_date is not null
         and v_programme_date > v_end_date
         and not coalesce(v_after_end_override, false) then
        raise exception
          'This fundraising project ended on %. An Administrator must enable the after-end override before new entries can be recorded.',
          v_end_date;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- RLS mirrors the trigger rule so PostgREST authorization also rejects a new
-- out-of-window project row even if trigger behaviour changes in future.
drop policy if exists revenue_insert on public.revenue_entries;

create policy revenue_insert
on public.revenue_entries
for insert
to authenticated
with check (
  state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = private.current_church_id()
      and p.branch_id in (select private.user_branch_ids())
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and private.has_finance_permission(p.branch_id)
      and (
        private.has_role('treasurer'::public.app_role, p.branch_id)
        or private.is_administrator()
      )
      and exists (
        select 1
        from public.offering_categories c
        where c.id = revenue_entries.category_id
          and c.church_id = p.church_id
          and c.active = true
          and (
            c.applies_to_all_service_types = true
            or exists (
              select 1
              from public.offering_category_service_types cs
              where cs.category_id = c.id
                and cs.service_type_id = p.service_type_id
            )
          )
          and (
            c.category_type <> 'project'::public.offering_category_type
            or exists (
              select 1
              from public.fundraising_projects fp
              where fp.category_id = c.id
                and (
                  fp.start_date is null
                  or p.programme_date >= fp.start_date
                )
                and (
                  fp.end_date is null
                  or p.programme_date <= fp.end_date
                  or fp.accepting_entries_after_end_override = true
                )
            )
          )
      )
  )
);

-- Project-setting changes are Administrator-authorized by the existing
-- fundraising_projects UPDATE RLS policy. Audit them at the database boundary,
-- including the after-end override, so the authorization is reviewable later.
create or replace function private.audit_fundraising_project_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_church_id uuid;
begin
  if new.target_amount is not distinct from old.target_amount
     and new.start_date is not distinct from old.start_date
     and new.end_date is not distinct from old.end_date
     and new.accepting_entries_after_end_override
       is not distinct from old.accepting_entries_after_end_override then
    return new;
  end if;

  select c.church_id
    into v_church_id
    from public.offering_categories c
   where c.id = new.category_id;

  insert into public.audit_events (
    church_id,
    actor_id,
    entity_table,
    entity_id,
    action,
    previous_value,
    new_value
  )
  values (
    v_church_id,
    auth.uid(),
    'fundraising_projects',
    new.id,
    'project_config_update',
    jsonb_build_object(
      'target_amount', old.target_amount,
      'start_date', old.start_date,
      'end_date', old.end_date,
      'accepting_entries_after_end_override',
        old.accepting_entries_after_end_override
    ),
    jsonb_build_object(
      'target_amount', new.target_amount,
      'start_date', new.start_date,
      'end_date', new.end_date,
      'accepting_entries_after_end_override',
        new.accepting_entries_after_end_override
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_fundraising_project_change()
  from public, anon, authenticated;
grant execute on function private.audit_fundraising_project_change()
  to service_role;

drop trigger if exists trg_audit_fundraising_project_change
  on public.fundraising_projects;

create trigger trg_audit_fundraising_project_change
after update of
  target_amount,
  start_date,
  end_date,
  accepting_entries_after_end_override
on public.fundraising_projects
for each row
execute function private.audit_fundraising_project_change();
