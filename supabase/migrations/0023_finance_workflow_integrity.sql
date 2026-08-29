-- Church OMS
-- Migration 0023: finance workflow integrity and branch-scoped finance RLS.
--
-- Finance is a set of revenue_entries for one programme. The original model
-- incremented each row independently while signoffs stored a single hard-coded
-- record_version. This migration adds a programme-level finance workflow header
-- so the set has one authoritative state/version, synchronizes entry versions at
-- each workflow transition, rejects zero-row/no-op transitions, and prevents
-- concurrent data edits from racing a submit/verify/return/reopen transition.
--
-- It also binds direct revenue RLS to the programme's actual branch. A user who
-- has finance access in Branch A plus a non-finance role in Branch B must not
-- gain Branch B finance visibility or write access.

alter table public.programme_occurrences
  add column if not exists finance_state public.record_state not null default 'draft',
  add column if not exists finance_version integer not null default 1
    check (finance_version > 0);

-- Backfill safely if this migration is ever applied to a database that already
-- contains finance data. The row with the highest version is the best legacy
-- signal for the current set state; the aggregate version is the max row
-- version. New installations remain at draft/version 1 until finance is used.
update public.programme_occurrences p
set
  finance_version = coalesce(
    (select max(r.version) from public.revenue_entries r where r.programme_id = p.id),
    1
  ),
  finance_state = coalesce(
    (
      select r.state
      from public.revenue_entries r
      where r.programme_id = p.id
      order by r.version desc, r.updated_at desc, r.id
      limit 1
    ),
    'draft'::public.record_state
  )
where exists (
  select 1 from public.revenue_entries r where r.programme_id = p.id
);

-- Keep finance-history permission active-user aware, matching the shared
-- authorization helpers hardened in 0021.
create or replace function public.has_finance_history_permission(
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
      and ur.finance_history_permission = true
      and (ur.branch_id is null or p_branch_id is null or ur.branch_id = p_branch_id)
  );
$$;

revoke all on function public.has_finance_history_permission(uuid) from public, anon;
grant execute on function public.has_finance_history_permission(uuid) to authenticated;

-- Direct finance reads must prove finance permission for the target branch,
-- not merely finance permission somewhere in the church.
drop policy if exists revenue_select on public.revenue_entries;
create policy revenue_select
on public.revenue_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (select public.user_branch_ids())
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_finance_history_permission(p.branch_id)
        or (
          revenue_entries.created_by = (select auth.uid())
          and revenue_entries.state <> 'verified'::public.record_state
        )
        or (
          public.has_role('finance_verifier'::public.app_role, p.branch_id)
          and revenue_entries.state = 'submitted'::public.record_state
        )
      )
  )
);

-- Entry edits are for the Treasurer/Accountant path (or an Administrator with
-- explicit finance permission), and only while the programme's finance header
-- is editable. Reopened is intentionally editable: the old policy accidentally
-- made reopened finance impossible to correct and resubmit.
drop policy if exists revenue_write on public.revenue_entries;
create policy revenue_write
on public.revenue_entries
for all
to authenticated
using (
  revenue_entries.state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (select public.user_branch_ids())
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_role('treasurer'::public.app_role, p.branch_id)
        or public.is_administrator()
      )
  )
)
with check (
  revenue_entries.state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (select public.user_branch_ids())
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_role('treasurer'::public.app_role, p.branch_id)
        or public.is_administrator()
      )
  )
);

-- Serialize finance-data edits against workflow transitions by taking a
-- key-share lock on the programme header whenever amounts/notes are inserted or
-- changed. A workflow transition holds FOR UPDATE on the same header, so an
-- in-flight edit either finishes before the transition or waits and is rejected
-- after the header becomes locked. Also preserve created_by on updates.
create or replace function public.guard_revenue_entry_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_finance_state public.record_state;
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;

    if new.programme_id is distinct from old.programme_id
       or new.category_id is distinct from old.category_id then
      raise exception 'A revenue entry cannot be moved to another programme or category';
    end if;

    if new.physical_amount is not distinct from old.physical_amount
       and new.online_amount is not distinct from old.online_amount
       and new.notes is not distinct from old.notes then
      return new;
    end if;
  end if;

  select p.finance_state
    into v_finance_state
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
    raise exception 'Finance entries are locked while finance state is %', v_finance_state;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_revenue_entry_edit() from public, anon, authenticated;

drop trigger if exists trg_guard_revenue_insert on public.revenue_entries;
create trigger trg_guard_revenue_insert
before insert on public.revenue_entries
for each row execute function public.guard_revenue_entry_edit();

drop trigger if exists trg_guard_revenue_update on public.revenue_entries;
create trigger trg_guard_revenue_update
before update on public.revenue_entries
for each row execute function public.guard_revenue_entry_edit();

-- ---------------------------------------------------------------------------
-- Version-aware finance workflow.
-- New overloads accept p_expected_version. Legacy signatures remain below as
-- compatibility wrappers so the current UI keeps working during deployment.
-- ---------------------------------------------------------------------------

create or replace function public.submit_finance(
  p_programme_id uuid,
  p_expected_version integer
)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
  v_count integer;
  v_next_version integer;
begin
  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id
  for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;
  if v_prog.church_id is distinct from public.current_church_id() then
    raise exception 'Not authorized to submit finance for this programme';
  end if;
  if not public.has_finance_permission(v_prog.branch_id) then
    raise exception 'Finance permission required for this branch';
  end if;
  if not public.has_role('treasurer'::public.app_role, v_prog.branch_id)
     and not public.is_administrator() then
    raise exception 'Not authorized to submit finance records';
  end if;
  if v_prog.finance_state not in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  ) then
    raise exception 'Finance record in state % cannot be submitted', v_prog.finance_state;
  end if;
  if p_expected_version is null or v_prog.finance_version <> p_expected_version then
    raise exception 'CONFLICT: finance record has been modified (expected version %, found %)',
      p_expected_version, v_prog.finance_version;
  end if;

  select count(*) into v_count
  from public.revenue_entries
  where programme_id = p_programme_id;

  if v_count = 0 then
    raise exception 'Add at least one finance entry before submitting';
  end if;

  if exists (
    select 1
    from public.revenue_entries
    where programme_id = p_programme_id
      and state not in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
  ) then
    raise exception 'Finance entries are out of sync with the programme finance state';
  end if;

  v_next_version := v_prog.finance_version + 1;

  update public.revenue_entries
     set state = 'submitted',
         version = v_next_version,
         updated_by = auth.uid()
   where programme_id = p_programme_id;

  update public.programme_occurrences
     set finance_state = 'submitted',
         finance_version = v_next_version
   where id = p_programme_id;

  insert into public.signoffs (
    programme_id, record_kind, action, actor_id, record_version
  )
  values (
    p_programme_id, 'finance', 'submit', auth.uid(), v_next_version
  );

  insert into public.audit_events (
    church_id, actor_id, entity_table, entity_id, action, previous_value, new_value
  )
  values (
    v_prog.church_id,
    auth.uid(),
    'revenue_entries',
    p_programme_id,
    'submit',
    jsonb_build_object('state', v_prog.finance_state, 'version', v_prog.finance_version),
    jsonb_build_object('state', 'submitted', 'version', v_next_version)
  );

  return query
  select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function public.verify_finance(
  p_programme_id uuid,
  p_expected_version integer
)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
  v_church public.churches;
  v_last_submitter uuid;
  v_count integer;
  v_next_version integer;
begin
  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id
  for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;
  if v_prog.church_id is distinct from public.current_church_id() then
    raise exception 'Not authorized to verify finance for this programme';
  end if;
  if not public.has_finance_permission(v_prog.branch_id) then
    raise exception 'Finance permission required for this branch';
  end if;
  if not public.has_role('finance_verifier'::public.app_role, v_prog.branch_id) then
    raise exception 'Not authorized to verify finance records';
  end if;
  if v_prog.finance_state <> 'submitted'::public.record_state then
    raise exception 'Finance record in state % cannot be verified', v_prog.finance_state;
  end if;
  if p_expected_version is null or v_prog.finance_version <> p_expected_version then
    raise exception 'CONFLICT: finance record has been modified (expected version %, found %)',
      p_expected_version, v_prog.finance_version;
  end if;

  select count(*) into v_count
  from public.revenue_entries
  where programme_id = p_programme_id;

  if v_count = 0 then
    raise exception 'No finance entries exist for this programme';
  end if;

  if exists (
    select 1
    from public.revenue_entries
    where programme_id = p_programme_id
      and (
        state <> 'submitted'::public.record_state
        or version <> v_prog.finance_version
      )
  ) then
    raise exception 'Finance entries are out of sync with the programme finance state';
  end if;

  select * into v_church
  from public.churches
  where id = v_prog.church_id;

  select actor_id into v_last_submitter
  from public.signoffs
  where programme_id = p_programme_id
    and record_kind = 'finance'
    and action = 'submit'
  order by created_at desc
  limit 1;

  if v_last_submitter is null then
    raise exception 'Finance submission sign-off is missing';
  end if;

  if v_church.finance_requires_independent_verification
     and v_last_submitter = auth.uid() then
    raise exception 'The preparer of a finance record cannot verify it';
  end if;

  v_next_version := v_prog.finance_version + 1;

  update public.revenue_entries
     set state = 'verified',
         version = v_next_version,
         updated_by = auth.uid()
   where programme_id = p_programme_id;

  update public.programme_occurrences
     set finance_state = 'verified',
         finance_version = v_next_version
   where id = p_programme_id;

  insert into public.signoffs (
    programme_id, record_kind, action, actor_id, record_version
  )
  values (
    p_programme_id, 'finance', 'verify', auth.uid(), v_next_version
  );

  insert into public.audit_events (
    church_id, actor_id, entity_table, entity_id, action, previous_value, new_value
  )
  values (
    v_prog.church_id,
    auth.uid(),
    'revenue_entries',
    p_programme_id,
    'verify',
    jsonb_build_object('state', v_prog.finance_state, 'version', v_prog.finance_version),
    jsonb_build_object('state', 'verified', 'version', v_next_version)
  );

  return query
  select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function public.return_finance(
  p_programme_id uuid,
  p_expected_version integer,
  p_reason text
)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
  v_count integer;
  v_next_version integer;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to return a finance record';
  end if;

  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id
  for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;
  if v_prog.church_id is distinct from public.current_church_id() then
    raise exception 'Not authorized to return finance for this programme';
  end if;
  if not public.has_finance_permission(v_prog.branch_id) then
    raise exception 'Finance permission required for this branch';
  end if;
  if not public.has_role('finance_verifier'::public.app_role, v_prog.branch_id) then
    raise exception 'Not authorized to return finance records';
  end if;
  if v_prog.finance_state <> 'submitted'::public.record_state then
    raise exception 'Finance record in state % cannot be returned', v_prog.finance_state;
  end if;
  if p_expected_version is null or v_prog.finance_version <> p_expected_version then
    raise exception 'CONFLICT: finance record has been modified (expected version %, found %)',
      p_expected_version, v_prog.finance_version;
  end if;

  select count(*) into v_count
  from public.revenue_entries
  where programme_id = p_programme_id;

  if v_count = 0 then
    raise exception 'No finance entries exist for this programme';
  end if;

  if exists (
    select 1
    from public.revenue_entries
    where programme_id = p_programme_id
      and (
        state <> 'submitted'::public.record_state
        or version <> v_prog.finance_version
      )
  ) then
    raise exception 'Finance entries are out of sync with the programme finance state';
  end if;

  v_next_version := v_prog.finance_version + 1;

  update public.revenue_entries
     set state = 'returned',
         version = v_next_version,
         updated_by = auth.uid()
   where programme_id = p_programme_id;

  update public.programme_occurrences
     set finance_state = 'returned',
         finance_version = v_next_version
   where id = p_programme_id;

  insert into public.signoffs (
    programme_id, record_kind, action, actor_id, record_version, reason
  )
  values (
    p_programme_id, 'finance', 'return', auth.uid(), v_next_version, p_reason
  );

  insert into public.audit_events (
    church_id, actor_id, entity_table, entity_id, action, previous_value, new_value
  )
  values (
    v_prog.church_id,
    auth.uid(),
    'revenue_entries',
    p_programme_id,
    'return',
    jsonb_build_object('state', v_prog.finance_state, 'version', v_prog.finance_version),
    jsonb_build_object('state', 'returned', 'version', v_next_version, 'reason', p_reason)
  );

  return query
  select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function public.reopen_finance(
  p_programme_id uuid,
  p_expected_version integer,
  p_reason text
)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
  v_count integer;
  v_next_version integer;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to reopen a finance record';
  end if;

  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id
  for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;
  if v_prog.church_id is distinct from public.current_church_id() then
    raise exception 'Not authorized to reopen finance for this programme';
  end if;
  if not public.is_administrator() then
    raise exception 'Only an administrator may reopen finance records';
  end if;
  if not public.has_finance_permission(v_prog.branch_id) then
    raise exception 'Finance permission required for this branch';
  end if;
  if v_prog.finance_state <> 'verified'::public.record_state then
    raise exception 'Finance record in state % cannot be reopened', v_prog.finance_state;
  end if;
  if p_expected_version is null or v_prog.finance_version <> p_expected_version then
    raise exception 'CONFLICT: finance record has been modified (expected version %, found %)',
      p_expected_version, v_prog.finance_version;
  end if;

  select count(*) into v_count
  from public.revenue_entries
  where programme_id = p_programme_id;

  if v_count = 0 then
    raise exception 'No finance entries exist for this programme';
  end if;

  if exists (
    select 1
    from public.revenue_entries
    where programme_id = p_programme_id
      and (
        state <> 'verified'::public.record_state
        or version <> v_prog.finance_version
      )
  ) then
    raise exception 'Finance entries are out of sync with the programme finance state';
  end if;

  v_next_version := v_prog.finance_version + 1;

  update public.revenue_entries
     set state = 'reopened',
         version = v_next_version,
         updated_by = auth.uid()
   where programme_id = p_programme_id;

  update public.programme_occurrences
     set finance_state = 'reopened',
         finance_version = v_next_version
   where id = p_programme_id;

  insert into public.signoffs (
    programme_id, record_kind, action, actor_id, record_version, reason
  )
  values (
    p_programme_id, 'finance', 'reopen', auth.uid(), v_next_version, p_reason
  );

  insert into public.audit_events (
    church_id, actor_id, entity_table, entity_id, action, previous_value, new_value
  )
  values (
    v_prog.church_id,
    auth.uid(),
    'revenue_entries',
    p_programme_id,
    'reopen',
    jsonb_build_object('state', v_prog.finance_state, 'version', v_prog.finance_version),
    jsonb_build_object('state', 'reopened', 'version', v_next_version, 'reason', p_reason)
  );

  return query
  select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

-- Legacy one-version-argument signatures remain as compatibility wrappers.
-- They fetch the current header version and delegate to the guarded overload.
create or replace function public.submit_finance(p_programme_id uuid)
returns setof public.revenue_entries
language sql
security definer
set search_path = public
as $$
  select *
  from public.submit_finance(
    p_programme_id,
    (select p.finance_version from public.programme_occurrences p where p.id = p_programme_id)
  );
$$;

create or replace function public.verify_finance(p_programme_id uuid)
returns setof public.revenue_entries
language sql
security definer
set search_path = public
as $$
  select *
  from public.verify_finance(
    p_programme_id,
    (select p.finance_version from public.programme_occurrences p where p.id = p_programme_id)
  );
$$;

create or replace function public.return_finance(p_programme_id uuid, p_reason text)
returns setof public.revenue_entries
language sql
security definer
set search_path = public
as $$
  select *
  from public.return_finance(
    p_programme_id,
    (select p.finance_version from public.programme_occurrences p where p.id = p_programme_id),
    p_reason
  );
$$;

create or replace function public.reopen_finance(p_programme_id uuid, p_reason text)
returns setof public.revenue_entries
language sql
security definer
set search_path = public
as $$
  select *
  from public.reopen_finance(
    p_programme_id,
    (select p.finance_version from public.programme_occurrences p where p.id = p_programme_id),
    p_reason
  );
$$;

-- Restrict every public workflow signature explicitly.
revoke all on function public.submit_finance(uuid) from public, anon;
revoke all on function public.submit_finance(uuid, integer) from public, anon;
revoke all on function public.verify_finance(uuid) from public, anon;
revoke all on function public.verify_finance(uuid, integer) from public, anon;
revoke all on function public.return_finance(uuid, text) from public, anon;
revoke all on function public.return_finance(uuid, integer, text) from public, anon;
revoke all on function public.reopen_finance(uuid, text) from public, anon;
revoke all on function public.reopen_finance(uuid, integer, text) from public, anon;

grant execute on function public.submit_finance(uuid) to authenticated;
grant execute on function public.submit_finance(uuid, integer) to authenticated;
grant execute on function public.verify_finance(uuid) to authenticated;
grant execute on function public.verify_finance(uuid, integer) to authenticated;
grant execute on function public.return_finance(uuid, text) to authenticated;
grant execute on function public.return_finance(uuid, integer, text) to authenticated;
grant execute on function public.reopen_finance(uuid, text) to authenticated;
grant execute on function public.reopen_finance(uuid, integer, text) to authenticated;
