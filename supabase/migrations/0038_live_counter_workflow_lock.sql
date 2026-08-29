-- Church OMS
-- Migration 0038: bind live-counter mutations to the attendance workflow.
--
-- Counter evidence must not keep changing after attendance has been digitally
-- submitted or verified. All counter table mutations already go through
-- SECURITY DEFINER RPCs, but those RPCs only checked the counter session state.
--
-- A single database trigger now serializes every counter INSERT/UPDATE against
-- the linked programme and allows writes only while attendance is draft,
-- returned or reopened. submit_attendance also refuses to sign while a live
-- counter session remains open.
--
-- Empty counters may be closed when nobody is still counting. This prevents an
-- accidentally-started optional counter from trapping the attendance workflow.

create or replace function private.guard_attendance_counter_workflow_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_programme_id uuid;
  v_attendance_state public.record_state;
  v_counting_count integer;
begin
  if tg_table_name = 'attendance_counter_sessions' then
    v_programme_id := new.programme_id;
  elsif tg_table_name = 'attendance_counter_entries' then
    select s.programme_id
      into v_programme_id
      from public.attendance_counter_sessions s
     where s.id = new.session_id;

    if v_programme_id is null then
      raise exception 'Counter session is not available';
    end if;
  else
    raise exception 'Unsupported live-counter table %', tg_table_name;
  end if;

  -- FOR KEY SHARE conflicts with the FOR UPDATE lock used by
  -- submit_attendance. Whichever operation reaches the programme first wins
  -- cleanly, so a counter cannot reopen/change underneath a concurrent signoff.
  select p.state
    into v_attendance_state
    from public.programme_occurrences p
   where p.id = v_programme_id
   for key share;

  if v_attendance_state is null then
    raise exception 'Programme is not available';
  end if;

  if v_attendance_state not in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  ) then
    raise exception
      'Live counter is locked while attendance state is %',
      v_attendance_state;
  end if;

  -- Enforce close consistency at the table boundary too, rather than relying
  -- only on the close RPC/UI.
  if tg_table_name = 'attendance_counter_sessions'
     and tg_op = 'UPDATE'
     and old.status = 'open'
     and new.status = 'closed' then
    select count(*)
      into v_counting_count
      from public.attendance_counter_entries e
     where e.session_id = new.id
       and e.status = 'counting';

    if v_counting_count > 0 then
      raise exception
        '% usher counter(s) are still counting. Ask them to submit before closing.',
        v_counting_count;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_attendance_counter_workflow_state()
  from public, anon, authenticated;
grant execute on function private.guard_attendance_counter_workflow_state()
  to service_role;

drop trigger if exists trg_guard_counter_session_workflow_state
  on public.attendance_counter_sessions;

create trigger trg_guard_counter_session_workflow_state
before insert or update
on public.attendance_counter_sessions
for each row
execute function private.guard_attendance_counter_workflow_state();

drop trigger if exists trg_guard_counter_entry_workflow_state
  on public.attendance_counter_entries;

create trigger trg_guard_counter_entry_workflow_state
before insert or update
on public.attendance_counter_entries
for each row
execute function private.guard_attendance_counter_workflow_state();

-- Allow an accidentally opened but unused counter to close at zero. A reviewer
-- may still reopen it while attendance remains editable.
create or replace function public.close_attendance_counter(
  p_session_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_total integer;
  v_counting integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select s.*
    into v_session
    from public.attendance_counter_sessions s
    join public.app_users u on u.id = v_user_id
   where s.id = p_session_id
     and u.active = true
     and u.church_id = s.church_id;

  if not found then
    raise exception 'Counter session is not available';
  end if;

  if not (
    public.has_role(
      'attendance_verifier'::public.app_role,
      v_session.branch_id
    )
    or public.is_administrator()
  ) then
    raise exception
      'Only an attendance verifier or administrator can close the counter';
  end if;

  if v_session.status = 'closed' then
    return v_session.submitted_total;
  end if;

  select count(*) filter (where e.status = 'counting')
    into v_counting
    from public.attendance_counter_entries e
   where e.session_id = p_session_id;

  if v_counting > 0 then
    raise exception
      '% usher counter(s) are still counting. Ask them to submit before closing.',
      v_counting;
  end if;

  update public.attendance_counter_sessions
     set status = 'closed',
         closed_by = v_user_id,
         closed_at = now(),
         updated_at = now()
   where id = p_session_id;

  select coalesce(sum(e.count), 0)::integer
    into v_total
    from public.attendance_counter_entries e
   where e.session_id = p_session_id
     and e.status = 'submitted';

  return v_total;
end;
$$;

revoke all on function public.close_attendance_counter(uuid)
  from public, anon;
grant execute on function public.close_attendance_counter(uuid)
  to authenticated;

-- Keep the existing attendance authorization/version/signoff semantics and add
-- one invariant: if the optional live counter was started, it must be closed
-- before the attendance record can be digitally signed.
create or replace function public.submit_attendance(
  p_programme_id uuid,
  p_expected_version integer
)
returns public.programme_occurrences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
  v_branch_ok boolean;
  v_previous_state public.record_state;
begin
  select *
    into v_prog
    from public.programme_occurrences
   where id = p_programme_id
   for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;

  if v_prog.church_id is distinct from public.current_church_id() then
    raise exception 'Not authorized to submit this record';
  end if;

  select (
    exists (
      select 1
      from public.user_branch_ids('usher'::public.app_role) b
      where b = v_prog.branch_id
    )
    or public.is_administrator()
  )
  into v_branch_ok;

  if not v_branch_ok or v_prog.created_by <> auth.uid() then
    raise exception 'Not authorized to submit this record';
  end if;

  if v_prog.state not in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  ) then
    raise exception
      'Record in state % cannot be submitted',
      v_prog.state;
  end if;

  if v_prog.version <> p_expected_version then
    raise exception
      'CONFLICT: record has been modified (expected version %, found %)',
      p_expected_version,
      v_prog.version;
  end if;

  if exists (
    select 1
    from public.attendance_counter_sessions s
    where s.programme_id = p_programme_id
      and s.status = 'open'
  ) then
    raise exception
      'Close the live attendance counter before signing and submitting attendance';
  end if;

  v_previous_state := v_prog.state;

  update public.programme_occurrences
     set state = 'submitted',
         version = version + 1
   where id = p_programme_id
   returning * into v_prog;

  insert into public.signoffs (
    programme_id,
    record_kind,
    action,
    actor_id,
    record_version
  )
  values (
    p_programme_id,
    'attendance',
    'submit',
    auth.uid(),
    v_prog.version
  );

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
    'programme_occurrences',
    p_programme_id,
    'submit',
    jsonb_build_object(
      'state', v_previous_state,
      'version', p_expected_version
    ),
    jsonb_build_object(
      'state', 'submitted',
      'version', v_prog.version
    )
  );

  return v_prog;
end;
$$;

revoke all on function public.submit_attendance(uuid, integer)
  from public, anon;
grant execute on function public.submit_attendance(uuid, integer)
  to authenticated;
