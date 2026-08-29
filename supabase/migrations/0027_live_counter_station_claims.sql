-- Church OMS
-- Migration 0027: unique live-counter door/counting-zone claims.
--
-- A combined tap counter is only trustworthy if two Ushers are not silently
-- counting the same doorway. Each counting user now claims one named station
-- (for example "Main entrance" or "Balcony stairs") before tapping.
-- Station labels are unique per counter session, case-insensitively.

alter table public.attendance_counter_entries
  add column if not exists station_label text;

create unique index if not exists uq_attendance_counter_station_per_session
  on public.attendance_counter_entries (
    session_id,
    lower(btrim(station_label))
  )
  where station_label is not null;

create or replace function public.claim_attendance_counter_station(
  p_session_id uuid,
  p_station_label text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_label text := btrim(coalesce(p_station_label, ''));
  v_existing_status text;
  v_previous_label text;
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if length(v_label) < 2 then
    raise exception 'Enter a door or counting-zone name';
  end if;
  if length(v_label) > 80 then
    raise exception 'Door or counting-zone name is too long';
  end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and s.status = 'open'
    and u.active = true
    and u.church_id = s.church_id;

  if not found then
    raise exception 'Counter session is not open';
  end if;

  if not (
    public.has_role('usher'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only Ushers assigned to this branch can claim a counting station';
  end if;

  select e.status, e.station_label
    into v_existing_status, v_previous_label
  from public.attendance_counter_entries e
  where e.session_id = p_session_id
    and e.user_id = v_user_id;

  if v_existing_status = 'submitted' then
    raise exception 'Resume your submitted count before changing the counting station';
  end if;

  begin
    insert into public.attendance_counter_entries (
      session_id,
      user_id,
      count,
      status,
      station_label,
      submitted_at,
      updated_at
    )
    values (
      p_session_id,
      v_user_id,
      0,
      'counting',
      v_label,
      null,
      now()
    )
    on conflict (session_id, user_id) do update
      set station_label = excluded.station_label,
          updated_at = now()
    returning id, station_label
      into v_entry_id, v_label;
  exception
    when unique_violation then
      raise exception 'That door or counting zone is already claimed by another Usher';
  end;

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
    v_session.church_id,
    v_user_id,
    'attendance_counter_entries',
    v_entry_id,
    'counter_station_claim',
    case
      when v_previous_label is null then null
      else jsonb_build_object('station_label', v_previous_label)
    end,
    jsonb_build_object('station_label', v_label)
  );

  return v_label;
end;
$$;

revoke all on function public.claim_attendance_counter_station(uuid, text)
  from public, anon;
grant execute on function public.claim_attendance_counter_station(uuid, text)
  to authenticated;

create or replace function public.increment_attendance_counter(
  p_session_id uuid,
  p_delta integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_existing_status text;
  v_station_label text;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_delta = 0 or p_delta < -25 or p_delta > 25 then
    raise exception 'Counter adjustment is outside the allowed range';
  end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and s.status = 'open'
    and u.active = true
    and u.church_id = s.church_id;

  if not found then
    raise exception 'Counter session is not open';
  end if;

  if not (
    public.has_role('usher'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only Ushers assigned to this branch can count';
  end if;

  select e.status, e.station_label
    into v_existing_status, v_station_label
  from public.attendance_counter_entries e
  where e.session_id = p_session_id
    and e.user_id = v_user_id;

  if not found or v_station_label is null then
    raise exception 'Claim a door or counting zone before counting';
  end if;

  if v_existing_status = 'submitted' then
    raise exception 'Your count has already been submitted. Resume it before changing the count.';
  end if;

  update public.attendance_counter_entries
     set count = greatest(0, count + p_delta),
         updated_at = now()
   where session_id = p_session_id
     and user_id = v_user_id
  returning count into v_count;

  return v_count;
end;
$$;

revoke all on function public.increment_attendance_counter(uuid, integer)
  from public, anon;
grant execute on function public.increment_attendance_counter(uuid, integer)
  to authenticated;

create or replace function public.submit_attendance_counter(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_count integer;
  v_status text;
  v_station_label text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and s.status = 'open'
    and u.active = true
    and u.church_id = s.church_id;

  if not found then
    raise exception 'Counter session is not open';
  end if;

  if not (
    public.has_role('usher'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only Ushers assigned to this branch can submit a count';
  end if;

  select e.count, e.status, e.station_label
    into v_count, v_status, v_station_label
  from public.attendance_counter_entries e
  where e.session_id = p_session_id
    and e.user_id = v_user_id;

  if not found or v_station_label is null then
    raise exception 'Claim a door or counting zone before submitting your count';
  end if;

  if v_status = 'submitted' then
    return v_count;
  end if;

  update public.attendance_counter_entries
     set status = 'submitted',
         submitted_at = now(),
         updated_at = now()
   where session_id = p_session_id
     and user_id = v_user_id
  returning count into v_count;

  return v_count;
end;
$$;

revoke all on function public.submit_attendance_counter(uuid)
  from public, anon;
grant execute on function public.submit_attendance_counter(uuid)
  to authenticated;

-- Include the station label in durable submit/resume audit events.
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
          'station_label', old.station_label,
          'submitted_at', old.submitted_at
        )
      else null
    end,
    jsonb_build_object(
      'status', new.status,
      'count', new.count,
      'station_label', new.station_label,
      'submitted_at', new.submitted_at
    )
  );

  return new;
end;
$$;

revoke all on function public.audit_attendance_counter_entry_lifecycle()
  from public, anon, authenticated;
