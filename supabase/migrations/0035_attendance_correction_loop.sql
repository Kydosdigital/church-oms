-- Church OMS
-- Migration 0035: atomic attendance correction and resubmission.
--
-- Returned/reopened records already existed in the state machine, but the app
-- had no atomic correction path. The public RPC remains SECURITY INVOKER.
-- A non-exposed private helper performs the privileged version increment and
-- audit write after re-checking actor, tenant, branch, state and expected
-- version. This keeps direct UPDATE(version) unavailable to authenticated users.

create or replace function private.apply_programme_correction(
  p_programme_id uuid,
  p_expected_version integer,
  p_preacher_id uuid,
  p_entry jsonb
)
returns public.programme_occurrences
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_programme public.programme_occurrences;
  v_previous_version integer;
  v_name text;
  v_classification public.programme_classification;
  v_men integer := coalesce((p_entry->>'men_count')::integer, 0);
  v_women integer := coalesce((p_entry->>'women_count')::integer, 0);
  v_teenagers integer := coalesce((p_entry->>'teenagers_count')::integer, 0);
  v_children integer := coalesce((p_entry->>'children_count')::integer, 0);
  v_first_timers integer := coalesce((p_entry->>'first_timers_count')::integer, 0);
  v_converts integer := coalesce((p_entry->>'converts_count')::integer, 0);
  v_new_births integer := coalesce((p_entry->>'new_births_count')::integer, 0);
  v_weddings integer := coalesce((p_entry->>'weddings_count')::integer, 0);
  v_capacity_note text := nullif(trim(p_entry->>'capacity_exception_note'), '');
  v_outcome_note text := nullif(trim(p_entry->>'outcome_exception_note'), '');
  v_total integer;
  v_attendance_rows integer;
begin
  select *
    into v_programme
    from public.programme_occurrences
   where id = p_programme_id
   for update;

  if v_programme is null then
    raise exception 'Programme not found';
  end if;

  if v_programme.church_id is distinct from private.current_church_id()
     or v_programme.created_by is distinct from auth.uid() then
    raise exception 'Only the original recorder can correct this programme';
  end if;

  if not (
    v_programme.branch_id in (
      select private.user_branch_ids('usher'::public.app_role)
    )
    or private.is_administrator()
  ) then
    raise exception 'Not authorized to correct this programme';
  end if;

  if v_programme.state not in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  ) then
    raise exception 'Programme in state % cannot be corrected', v_programme.state;
  end if;

  if v_programme.version <> p_expected_version then
    raise exception
      'CONFLICT: record has been modified (expected version %, found %)',
      p_expected_version,
      v_programme.version;
  end if;

  v_name := nullif(trim(p_entry->>'programme_name'), '');
  if v_name is null then
    raise exception 'Programme name is required';
  end if;

  v_classification := coalesce(
    nullif(p_entry->>'classification', ''),
    v_programme.classification::text
  )::public.programme_classification;

  if least(
    v_men,
    v_women,
    v_teenagers,
    v_children,
    v_first_timers,
    v_converts,
    v_new_births,
    v_weddings
  ) < 0 then
    raise exception 'Attendance and outcome counts cannot be negative';
  end if;

  v_total := v_men + v_women + v_teenagers + v_children;

  if v_programme.venue_capacity_snapshot > 0
     and v_total > v_programme.venue_capacity_snapshot
     and v_capacity_note is null then
    raise exception
      'Attendance exceeds venue capacity; add an explanatory note';
  end if;

  if (v_first_timers > v_total or v_converts > v_total)
     and v_outcome_note is null then
    raise exception
      'First-timers or converts exceed total attendance; add an explanatory note';
  end if;

  if p_preacher_id is not null
     and not exists (
       select 1
       from public.ministers m
       where m.id = p_preacher_id
         and m.church_id = v_programme.church_id
         and m.active = true
     ) then
    raise exception 'Selected preacher is not available for this church';
  end if;

  v_previous_version := v_programme.version;

  update public.programme_occurrences
     set programme_name = v_name,
         classification = v_classification,
         preacher_id = p_preacher_id,
         sermon_topic = nullif(trim(p_entry->>'sermon_topic'), ''),
         notes = nullif(trim(p_entry->>'notes'), ''),
         version = version + 1
   where id = p_programme_id
   returning * into v_programme;

  update public.attendance_records
     set men_count = v_men,
         women_count = v_women,
         teenagers_count = v_teenagers,
         children_count = v_children,
         first_timers_count = v_first_timers,
         converts_count = v_converts,
         new_births_count = v_new_births,
         weddings_count = v_weddings,
         capacity_exception_note = v_capacity_note,
         outcome_exception_note = v_outcome_note
   where programme_id = p_programme_id;

  get diagnostics v_attendance_rows = row_count;
  if v_attendance_rows <> 1 then
    raise exception 'Programme attendance row is missing';
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
    v_programme.church_id,
    auth.uid(),
    'programme_occurrences',
    v_programme.id,
    'edit',
    jsonb_build_object('version', v_previous_version),
    jsonb_build_object('version', v_programme.version)
  );

  return v_programme;
end;
$$;

revoke all on function private.apply_programme_correction(
  uuid, integer, uuid, jsonb
) from public, anon;

grant execute on function private.apply_programme_correction(
  uuid, integer, uuid, jsonb
) to authenticated, service_role;

create or replace function public.update_programme_entry(
  p_programme_id uuid,
  p_expected_version integer,
  p_entry jsonb,
  p_submit boolean default false
)
returns public.programme_occurrences
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_church_id uuid := private.current_church_id();
  v_current public.programme_occurrences;
  v_programme public.programme_occurrences;
  v_preacher_type text;
  v_preacher_id uuid;
  v_guest_name text;
begin
  if auth.uid() is null or v_church_id is null then
    raise exception 'Not authenticated or account is inactive';
  end if;

  if p_entry is null or jsonb_typeof(p_entry) <> 'object' then
    raise exception 'Programme correction must be a JSON object';
  end if;

  select *
    into v_current
    from public.programme_occurrences
   where id = p_programme_id;

  if v_current is null then
    raise exception 'Programme not found';
  end if;

  v_preacher_type := coalesce(
    nullif(p_entry->>'preacher_type', ''),
    case
      when v_current.preacher_id is null then 'none'
      else 'existing'
    end
  );

  if v_preacher_type = 'none' then
    v_preacher_id := null;
  elsif v_preacher_type = 'existing' then
    v_preacher_id := nullif(p_entry->>'preacher_id', '')::uuid;
    if v_preacher_id is null then
      raise exception 'Select the preacher';
    end if;
  elsif v_preacher_type = 'guest' then
    v_guest_name := nullif(trim(p_entry->>'guest_preacher_name'), '');

    if v_guest_name is null then
      raise exception 'Enter the guest preacher name';
    end if;

    select m.id
      into v_preacher_id
      from public.ministers m
     where m.church_id = v_church_id
       and m.full_name = v_guest_name
       and m.is_guest = true
       and m.active = true
     order by m.created_at
     limit 1;

    if v_preacher_id is null then
      insert into public.ministers (
        church_id,
        full_name,
        is_guest,
        active
      )
      values (
        v_church_id,
        v_guest_name,
        true,
        true
      )
      returning id into v_preacher_id;
    end if;
  else
    raise exception 'Unknown preacher type';
  end if;

  select *
    into v_programme
    from private.apply_programme_correction(
      p_programme_id,
      p_expected_version,
      v_preacher_id,
      p_entry
    );

  if p_submit then
    select *
      into v_programme
      from public.submit_attendance(
        v_programme.id,
        v_programme.version
      );
  end if;

  return v_programme;
end;
$$;

revoke all on function public.update_programme_entry(
  uuid, integer, jsonb, boolean
) from public, anon;

grant execute on function public.update_programme_entry(
  uuid, integer, jsonb, boolean
) to authenticated;
