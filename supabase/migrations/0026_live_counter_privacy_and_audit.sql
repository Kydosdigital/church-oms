-- Church OMS
-- Migration 0026: privacy-preserving live attendance aggregation and lifecycle audit.
--
-- The original realtime design let every Usher SELECT every individual counter
-- row so the client could calculate a combined total. The UI hid the breakdown
-- from ordinary Ushers, but the underlying rows were still queryable.
--
-- Keep the useful live total without that privacy leak by storing aggregate
-- counters on the session row. Ushers can read the session aggregate plus
-- their own entry; Attendance Verifiers, Pastors and Administrators can still
-- review the individual breakdown. Counter lifecycle events are also audited.

alter table public.attendance_counter_sessions
  add column if not exists live_total integer not null default 0 check (live_total >= 0),
  add column if not exists submitted_total integer not null default 0 check (submitted_total >= 0),
  add column if not exists counter_count integer not null default 0 check (counter_count >= 0),
  add column if not exists counting_count integer not null default 0 check (counting_count >= 0),
  add column if not exists submitted_count integer not null default 0 check (submitted_count >= 0);

create or replace function public.recompute_attendance_counter_session(
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attendance_counter_sessions s
     set live_total = aggregate.live_total,
         submitted_total = aggregate.submitted_total,
         counter_count = aggregate.counter_count,
         counting_count = aggregate.counting_count,
         submitted_count = aggregate.submitted_count,
         updated_at = now()
    from (
      select
        coalesce(sum(e.count), 0)::integer as live_total,
        coalesce(sum(e.count) filter (where e.status = 'submitted'), 0)::integer as submitted_total,
        count(*)::integer as counter_count,
        count(*) filter (where e.status = 'counting')::integer as counting_count,
        count(*) filter (where e.status = 'submitted')::integer as submitted_count
      from public.attendance_counter_entries e
      where e.session_id = p_session_id
    ) aggregate
   where s.id = p_session_id;
end;
$$;

revoke all on function public.recompute_attendance_counter_session(uuid)
  from public, anon, authenticated;

create or replace function public.sync_attendance_counter_session_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_attendance_counter_session(old.session_id);
    return old;
  end if;

  perform public.recompute_attendance_counter_session(new.session_id);

  if tg_op = 'UPDATE' and old.session_id is distinct from new.session_id then
    perform public.recompute_attendance_counter_session(old.session_id);
  end if;

  return new;
end;
$$;

revoke all on function public.sync_attendance_counter_session_totals()
  from public, anon, authenticated;

drop trigger if exists trg_sync_attendance_counter_session_totals
  on public.attendance_counter_entries;
create trigger trg_sync_attendance_counter_session_totals
after insert or update or delete
on public.attendance_counter_entries
for each row
execute function public.sync_attendance_counter_session_totals();

-- Backfill aggregate columns for any counter sessions that already exist.
do $$
declare
  v_session_id uuid;
begin
  for v_session_id in
    select id from public.attendance_counter_sessions
  loop
    perform public.recompute_attendance_counter_session(v_session_id);
  end loop;
end;
$$;

-- Ushers may observe the live aggregate session, but individual counter rows
-- are limited to the current Usher's own row unless the caller is a reviewer.
drop policy if exists attendance_counter_entries_select
  on public.attendance_counter_entries;
create policy attendance_counter_entries_select
on public.attendance_counter_entries
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.attendance_counter_sessions s
      where s.id = attendance_counter_entries.session_id
        and s.church_id = public.current_church_id()
        and (
          public.has_role('usher'::public.app_role, s.branch_id)
          or public.is_administrator()
        )
    )
  )
  or exists (
    select 1
    from public.attendance_counter_sessions s
    where s.id = attendance_counter_entries.session_id
      and s.church_id = public.current_church_id()
      and (
        public.has_role('attendance_verifier'::public.app_role, s.branch_id)
        or public.has_role('pastor'::public.app_role)
        or public.is_administrator()
      )
  )
);

-- Audit meaningful workflow lifecycle events, not every tap. Individual count
-- adjustments remain visible through the entry's count/updated_at; final
-- submit/resume and session open/reopen/close actions are durable audit events.
create or replace function public.audit_attendance_counter_session_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_actor uuid;
  v_previous jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'counter_open';
    v_actor := coalesce(auth.uid(), new.opened_by);
    v_previous := null;
  elsif old.status = 'closed' and new.status = 'open' then
    v_action := 'counter_reopen';
    v_actor := coalesce(auth.uid(), new.opened_by);
    v_previous := jsonb_build_object(
      'status', old.status,
      'submitted_total', old.submitted_total,
      'counter_count', old.counter_count
    );
  elsif old.status = 'open' and new.status = 'closed' then
    v_action := 'counter_close';
    v_actor := coalesce(auth.uid(), new.closed_by);
    v_previous := jsonb_build_object(
      'status', old.status,
      'submitted_total', old.submitted_total,
      'counter_count', old.counter_count
    );
  else
    return new;
  end if;

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
    new.church_id,
    v_actor,
    'attendance_counter_sessions',
    new.id,
    v_action,
    v_previous,
    jsonb_build_object(
      'status', new.status,
      'live_total', new.live_total,
      'submitted_total', new.submitted_total,
      'counter_count', new.counter_count,
      'counting_count', new.counting_count,
      'submitted_count', new.submitted_count
    )
  );

  return new;
end;
$$;

revoke all on function public.audit_attendance_counter_session_lifecycle()
  from public, anon, authenticated;

drop trigger if exists trg_audit_attendance_counter_session_lifecycle
  on public.attendance_counter_sessions;
create trigger trg_audit_attendance_counter_session_lifecycle
after insert or update of status
on public.attendance_counter_sessions
for each row
execute function public.audit_attendance_counter_session_lifecycle();

create or replace function public.audit_attendance_counter_entry_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_church_id uuid;
begin
  if tg_op = 'INSERT' and new.status = 'submitted' then
    v_action := 'counter_submit';
  elsif tg_op = 'UPDATE'
        and old.status = 'counting'
        and new.status = 'submitted' then
    v_action := 'counter_submit';
  elsif tg_op = 'UPDATE'
        and old.status = 'submitted'
        and new.status = 'counting' then
    v_action := 'counter_resume';
  else
    return new;
  end if;

  select s.church_id
    into v_church_id
    from public.attendance_counter_sessions s
   where s.id = new.session_id;

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
    coalesce(auth.uid(), new.user_id),
    'attendance_counter_entries',
    new.id,
    v_action,
    case
      when tg_op = 'UPDATE'
        then jsonb_build_object(
          'status', old.status,
          'count', old.count,
          'submitted_at', old.submitted_at
        )
      else null
    end,
    jsonb_build_object(
      'status', new.status,
      'count', new.count,
      'submitted_at', new.submitted_at
    )
  );

  return new;
end;
$$;

revoke all on function public.audit_attendance_counter_entry_lifecycle()
  from public, anon, authenticated;

drop trigger if exists trg_audit_attendance_counter_entry_lifecycle
  on public.attendance_counter_entries;
create trigger trg_audit_attendance_counter_entry_lifecycle
after insert or update of status
on public.attendance_counter_entries
for each row
execute function public.audit_attendance_counter_entry_lifecycle();
