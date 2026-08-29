-- Church OMS
-- Migration 0037: atomic finance entry-set edits and optional submission.
--
-- The previous UI saved revenue amounts and submitted finance in two separate
-- requests. A submit failure could therefore leave draft edits persisted even
-- though the user clicked "Sign & submit". Draft saves also did not advance the
-- finance version, allowing stale sessions to overwrite one another.
--
-- The public RPC remains SECURITY INVOKER so all revenue INSERT/UPDATE/DELETE
-- statements still pass through normal RLS and the revenue-entry guard trigger.
-- A private helper performs only the privileged programme-header version bump
-- after re-checking tenant, branch permission, editable state and the caller's
-- expected finance version. Any later error rolls the entire RPC back.

create or replace function private.begin_finance_edit(
  p_programme_id uuid,
  p_expected_version integer
)
returns public.programme_occurrences
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prog public.programme_occurrences;
  v_next_version integer;
begin
  select *
    into v_prog
    from public.programme_occurrences
   where id = p_programme_id
   for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;

  if v_prog.church_id is distinct from private.current_church_id() then
    raise exception 'Not authorized to edit finance for this programme';
  end if;

  if not private.has_finance_permission(v_prog.branch_id) then
    raise exception 'Finance permission required for this branch';
  end if;

  if not private.has_role('treasurer'::public.app_role, v_prog.branch_id)
     and not private.is_administrator() then
    raise exception 'Not authorized to edit finance records';
  end if;

  if v_prog.finance_state not in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  ) then
    raise exception
      'Finance record in state % cannot be edited',
      v_prog.finance_state;
  end if;

  if p_expected_version is null
     or v_prog.finance_version <> p_expected_version then
    raise exception
      'CONFLICT: finance record has been modified (expected version %, found %)',
      p_expected_version,
      v_prog.finance_version;
  end if;

  v_next_version := v_prog.finance_version + 1;

  update public.programme_occurrences
     set finance_version = v_next_version
   where id = p_programme_id
   returning * into v_prog;

  -- Existing rows move to the same draft-set version before amount changes.
  -- The revenue guard preserves created_by and allows this metadata-only update.
  update public.revenue_entries
     set version = v_next_version,
         state = v_prog.finance_state,
         updated_by = auth.uid()
   where programme_id = p_programme_id;

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
    v_prog.church_id,
    auth.uid(),
    'revenue_entries',
    p_programme_id,
    'edit',
    jsonb_build_object(
      'state', v_prog.finance_state,
      'version', p_expected_version
    ),
    jsonb_build_object(
      'state', v_prog.finance_state,
      'version', v_next_version
    )
  );

  return v_prog;
end;
$$;

revoke all on function private.begin_finance_edit(uuid, integer)
  from public, anon;
grant execute on function private.begin_finance_edit(uuid, integer)
  to authenticated, service_role;

create or replace function public.save_finance_entry_set(
  p_programme_id uuid,
  p_expected_version integer,
  p_entries jsonb,
  p_submit boolean default false
)
returns public.programme_occurrences
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prog public.programme_occurrences;
  v_entry_count integer;
  v_unique_category_count integer;
begin
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Finance entries must be a JSON array';
  end if;

  select
    count(*),
    count(distinct entry.category_id)
  into
    v_entry_count,
    v_unique_category_count
  from jsonb_to_recordset(p_entries) as entry(
    category_id uuid,
    physical_amount numeric,
    online_amount numeric,
    notes text
  );

  if v_entry_count <> v_unique_category_count then
    raise exception 'Each offering category may appear only once';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as entry(
      category_id uuid,
      physical_amount numeric,
      online_amount numeric,
      notes text
    )
    where entry.category_id is null
       or entry.physical_amount is null
       or entry.online_amount is null
       or entry.physical_amount < 0
       or entry.online_amount < 0
  ) then
    raise exception 'Offering amounts must be valid non-negative numbers';
  end if;

  -- This lock is held until the whole RPC finishes. The version advance occurs
  -- before entry writes, but PostgreSQL rolls it back if any later RLS, trigger
  -- or workflow check fails.
  select *
    into v_prog
    from private.begin_finance_edit(
      p_programme_id,
      p_expected_version
    );

  insert into public.revenue_entries (
    programme_id,
    category_id,
    physical_amount,
    online_amount,
    notes,
    state,
    version,
    created_by,
    updated_by
  )
  select
    p_programme_id,
    entry.category_id,
    entry.physical_amount,
    entry.online_amount,
    nullif(trim(entry.notes), ''),
    v_prog.finance_state,
    v_prog.finance_version,
    auth.uid(),
    auth.uid()
  from jsonb_to_recordset(p_entries) as entry(
    category_id uuid,
    physical_amount numeric,
    online_amount numeric,
    notes text
  )
  where entry.physical_amount > 0
     or entry.online_amount > 0
     or nullif(trim(entry.notes), '') is not null
  on conflict (programme_id, category_id)
  do update
     set physical_amount = excluded.physical_amount,
         online_amount = excluded.online_amount,
         notes = excluded.notes,
         updated_by = auth.uid(),
         state = v_prog.finance_state,
         version = v_prog.finance_version;

  -- A category intentionally cleared back to zero is deleted rather than
  -- leaving a stale historic amount in the editable finance set.
  delete from public.revenue_entries existing
  using jsonb_to_recordset(p_entries) as entry(
    category_id uuid,
    physical_amount numeric,
    online_amount numeric,
    notes text
  )
  where existing.programme_id = p_programme_id
    and existing.category_id = entry.category_id
    and entry.physical_amount = 0
    and entry.online_amount = 0
    and nullif(trim(entry.notes), '') is null;

  if p_submit then
    -- submit_finance performs its own authorization, state, zero-row and
    -- optimistic-version checks. Any failure rolls this entire RPC back.
    perform 1
    from public.submit_finance(
      p_programme_id,
      v_prog.finance_version
    );
  end if;

  select *
    into v_prog
    from public.programme_occurrences
   where id = p_programme_id;

  return v_prog;
end;
$$;

revoke all on function public.save_finance_entry_set(
  uuid, integer, jsonb, boolean
) from public, anon;

grant execute on function public.save_finance_entry_set(
  uuid, integer, jsonb, boolean
) to authenticated;
