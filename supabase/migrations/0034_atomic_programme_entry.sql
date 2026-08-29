-- Church OMS
-- Migration 0034: atomic programme entry.
--
-- Programme creation previously used separate client-side inserts for the
-- programme header, attendance row and guest-minister links, followed by a
-- separate submit RPC. A later failure could therefore leave a partial draft.
--
-- This migration adds one SECURITY INVOKER RPC. PostgreSQL executes one RPC
-- invocation as a single statement, so programme creation, attendance,
-- preacher creation/linking, and optional submission either all succeed or
-- all roll back together. SECURITY INVOKER keeps the existing table grants,
-- RLS policies and workflow RPC authorization in force.

-- Administrators can create programmes church-wide, so guest-minister link
-- policies must align with the programme-entry policy rather than requiring a
-- separate Usher assignment.
drop policy if exists programme_guest_ministers_insert
  on public.programme_guest_ministers;

create policy programme_guest_ministers_insert
on public.programme_guest_ministers
for insert
to authenticated
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.created_by = (select auth.uid())
      and (
        p.branch_id in (
          select private.user_branch_ids('usher'::public.app_role)
        )
        or private.is_administrator()
      )
  )
  and minister_id in (
    select m.id
    from public.ministers m
    where m.church_id = private.current_church_id()
      and m.active = true
  )
);

drop policy if exists programme_guest_ministers_update
  on public.programme_guest_ministers;

create policy programme_guest_ministers_update
on public.programme_guest_ministers
for update
to authenticated
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state
      )
      and (
        p.branch_id in (
          select private.user_branch_ids('usher'::public.app_role)
        )
        or private.is_administrator()
      )
  )
)
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.created_by = (select auth.uid())
      and (
        p.branch_id in (
          select private.user_branch_ids('usher'::public.app_role)
        )
        or private.is_administrator()
      )
  )
  and minister_id in (
    select m.id
    from public.ministers m
    where m.church_id = private.current_church_id()
      and m.active = true
  )
);

drop policy if exists programme_guest_ministers_delete
  on public.programme_guest_ministers;

create policy programme_guest_ministers_delete
on public.programme_guest_ministers
for delete
to authenticated
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state
      )
      and (
        p.branch_id in (
          select private.user_branch_ids('usher'::public.app_role)
        )
        or private.is_administrator()
      )
  )
);

create or replace function public.create_programme_entry(
  p_entry jsonb,
  p_submit boolean default false
)
returns public.programme_occurrences
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_church_id uuid := private.current_church_id();
  v_branch_id uuid;
  v_service_type_id uuid;
  v_venue_id uuid;
  v_programme_date date;
  v_programme_name text;
  v_classification public.programme_classification;
  v_preacher_type text;
  v_preacher_id uuid;
  v_guest_preacher_name text;
  v_sermon_topic text;
  v_notes text;
  v_capacity_note text;
  v_outcome_note text;
  v_duplicate_override boolean;
  v_duplicate_reason text;
  v_duplicate_exists boolean;
  v_capacity integer;
  v_men integer;
  v_women integer;
  v_teenagers integer;
  v_children integer;
  v_first_timers integer;
  v_converts integer;
  v_new_births integer;
  v_weddings integer;
  v_total integer;
  v_requested_guest_count integer;
  v_valid_guest_count integer;
  v_programme public.programme_occurrences;
begin
  if v_user_id is null or v_church_id is null then
    raise exception 'Not authenticated or account is inactive';
  end if;

  if p_entry is null or jsonb_typeof(p_entry) <> 'object' then
    raise exception 'Programme entry must be a JSON object';
  end if;

  v_branch_id := nullif(p_entry->>'branch_id', '')::uuid;
  v_service_type_id := nullif(p_entry->>'service_type_id', '')::uuid;
  v_venue_id := nullif(p_entry->>'venue_id', '')::uuid;
  v_programme_date := nullif(p_entry->>'programme_date', '')::date;
  v_programme_name := nullif(trim(p_entry->>'programme_name'), '');
  v_classification := coalesce(
    nullif(p_entry->>'classification', ''),
    'routine'
  )::public.programme_classification;
  v_preacher_type := coalesce(
    nullif(p_entry->>'preacher_type', ''),
    'none'
  );
  v_guest_preacher_name := nullif(
    trim(p_entry->>'guest_preacher_name'),
    ''
  );
  v_sermon_topic := nullif(trim(p_entry->>'sermon_topic'), '');
  v_notes := nullif(trim(p_entry->>'notes'), '');
  v_capacity_note := nullif(
    trim(p_entry->>'capacity_exception_note'),
    ''
  );
  v_outcome_note := nullif(
    trim(p_entry->>'outcome_exception_note'),
    ''
  );
  v_duplicate_override := coalesce(
    (p_entry->>'duplicate_override')::boolean,
    false
  );
  v_duplicate_reason := nullif(
    trim(p_entry->>'duplicate_override_reason'),
    ''
  );

  if v_programme_date is null or v_programme_name is null then
    raise exception 'Programme date and name are required';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.id = v_branch_id
      and b.church_id = v_church_id
      and b.active = true
  ) then
    raise exception 'Selected branch is not available';
  end if;

  if not (
    v_branch_id in (
      select private.user_branch_ids('usher'::public.app_role)
    )
    or private.is_administrator()
  ) then
    raise exception 'Not authorized to create a programme for this branch';
  end if;

  if not exists (
    select 1
    from public.service_types s
    where s.id = v_service_type_id
      and s.church_id = v_church_id
      and s.active = true
  ) then
    raise exception 'Selected service type is not available';
  end if;

  select v.default_capacity
    into v_capacity
    from public.venues v
   where v.id = v_venue_id
     and v.branch_id = v_branch_id
     and v.active = true;

  if v_capacity is null then
    raise exception 'Selected venue is not available for this branch';
  end if;

  v_men := coalesce((p_entry->>'men_count')::integer, 0);
  v_women := coalesce((p_entry->>'women_count')::integer, 0);
  v_teenagers := coalesce((p_entry->>'teenagers_count')::integer, 0);
  v_children := coalesce((p_entry->>'children_count')::integer, 0);
  v_first_timers := coalesce(
    (p_entry->>'first_timers_count')::integer,
    0
  );
  v_converts := coalesce((p_entry->>'converts_count')::integer, 0);
  v_new_births := coalesce((p_entry->>'new_births_count')::integer, 0);
  v_weddings := coalesce((p_entry->>'weddings_count')::integer, 0);

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

  if v_capacity > 0
     and v_total > v_capacity
     and v_capacity_note is null then
    raise exception
      'Attendance exceeds venue capacity; add an explanatory note';
  end if;

  if (v_first_timers > v_total or v_converts > v_total)
     and v_outcome_note is null then
    raise exception
      'First-timers or converts exceed total attendance; add an explanatory note';
  end if;

  if v_preacher_type = 'none' then
    v_preacher_id := null;
  elsif v_preacher_type = 'existing' then
    v_preacher_id := nullif(p_entry->>'preacher_id', '')::uuid;

    if not exists (
      select 1
      from public.ministers m
      where m.id = v_preacher_id
        and m.church_id = v_church_id
        and m.active = true
    ) then
      raise exception
        'Selected preacher is not available for this church';
    end if;
  elsif v_preacher_type = 'guest' then
    if v_guest_preacher_name is null then
      raise exception 'Enter the guest preacher name';
    end if;

    select m.id
      into v_preacher_id
      from public.ministers m
     where m.church_id = v_church_id
       and m.full_name = v_guest_preacher_name
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
        v_guest_preacher_name,
        true,
        true
      )
      returning id into v_preacher_id;
    end if;
  else
    raise exception 'Unknown preacher type';
  end if;

  if p_entry ? 'guest_minister_ids'
     and jsonb_typeof(p_entry->'guest_minister_ids') <> 'array' then
    raise exception 'Guest minister ids must be an array';
  end if;

  select
    count(distinct requested.id),
    count(distinct m.id)
  into
    v_requested_guest_count,
    v_valid_guest_count
  from (
    select value::uuid as id
    from jsonb_array_elements_text(
      coalesce(p_entry->'guest_minister_ids', '[]'::jsonb)
    )
  ) requested
  left join public.ministers m
    on m.id = requested.id
   and m.church_id = v_church_id
   and m.active = true;

  if v_requested_guest_count <> v_valid_guest_count then
    raise exception
      'One or more guest ministers are not available for this church';
  end if;

  select exists (
    select 1
    from public.programme_occurrences p
    where p.branch_id = v_branch_id
      and p.service_type_id = v_service_type_id
      and p.programme_date = v_programme_date
  ) into v_duplicate_exists;

  if v_duplicate_exists and not v_duplicate_override then
    raise exception
      'A programme already exists for this branch, service type and date';
  end if;

  if v_duplicate_exists
     and v_duplicate_override
     and v_duplicate_reason is null then
    raise exception
      'Add a reason for recording a duplicate service on the same day';
  end if;

  insert into public.programme_occurrences (
    church_id,
    branch_id,
    service_type_id,
    venue_id,
    programme_date,
    programme_name,
    classification,
    preacher_id,
    sermon_topic,
    venue_capacity_snapshot,
    notes,
    duplicate_override,
    duplicate_override_reason,
    created_by
  )
  values (
    v_church_id,
    v_branch_id,
    v_service_type_id,
    v_venue_id,
    v_programme_date,
    v_programme_name,
    v_classification,
    v_preacher_id,
    v_sermon_topic,
    v_capacity,
    v_notes,
    v_duplicate_exists and v_duplicate_override,
    case
      when v_duplicate_exists and v_duplicate_override
      then v_duplicate_reason
      else null
    end,
    v_user_id
  )
  returning * into v_programme;

  insert into public.attendance_records (
    programme_id,
    men_count,
    women_count,
    teenagers_count,
    children_count,
    first_timers_count,
    converts_count,
    new_births_count,
    weddings_count,
    capacity_exception_note,
    outcome_exception_note
  )
  values (
    v_programme.id,
    v_men,
    v_women,
    v_teenagers,
    v_children,
    v_first_timers,
    v_converts,
    v_new_births,
    v_weddings,
    v_capacity_note,
    v_outcome_note
  );

  insert into public.programme_guest_ministers (
    programme_id,
    minister_id
  )
  select
    v_programme.id,
    requested.id
  from (
    select distinct value::uuid as id
    from jsonb_array_elements_text(
      coalesce(p_entry->'guest_minister_ids', '[]'::jsonb)
    )
  ) requested;

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

revoke all on function public.create_programme_entry(jsonb, boolean)
  from public, anon;
grant execute on function public.create_programme_entry(jsonb, boolean)
  to authenticated;
