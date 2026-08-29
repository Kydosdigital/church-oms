-- Church OMS
-- Migration 0024: align programme-entry permissions with the application
-- model and protect workflow-controlled columns from direct client writes.
--
-- The application intentionally lets an Administrator/Super Admin create a
-- programme on behalf of any branch. The original RLS allowed only an Usher,
-- which meant the UI could offer a valid-looking flow that failed at save.
--
-- This migration also fixes two workflow-integrity gaps:
--   * reopened attendance records must be editable/resubmittable by their
--     original creator;
--   * authenticated clients must not directly set attendance/finance workflow
--     state or version columns. Those transitions belong to signed RPCs.

drop policy if exists programme_insert on public.programme_occurrences;
create policy programme_insert
on public.programme_occurrences
for insert
to authenticated
with check (
  church_id = public.current_church_id()
  and created_by = (select auth.uid())
  and state = 'draft'::public.record_state
  and version = 1
  and finance_state = 'draft'::public.record_state
  and finance_version = 1
  and (
    branch_id in (select public.user_branch_ids('usher'::public.app_role))
    or (
      public.is_administrator()
      and branch_id in (
        select b.id
        from public.branches b
        where b.church_id = public.current_church_id()
      )
    )
  )
);

drop policy if exists programme_update on public.programme_occurrences;
create policy programme_update
on public.programme_occurrences
for update
to authenticated
using (
  church_id = public.current_church_id()
  and created_by = (select auth.uid())
  and state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and (
    branch_id in (select public.user_branch_ids('usher'::public.app_role))
    or public.is_administrator()
  )
)
with check (
  church_id = public.current_church_id()
  and created_by = (select auth.uid())
  and state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and (
    branch_id in (select public.user_branch_ids('usher'::public.app_role))
    or (
      public.is_administrator()
      and branch_id in (
        select b.id
        from public.branches b
        where b.church_id = public.current_church_id()
      )
    )
  )
);

drop policy if exists attendance_write on public.attendance_records;
create policy attendance_write
on public.attendance_records
for all
to authenticated
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.church_id = public.current_church_id()
      and p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and (
        p.branch_id in (select public.user_branch_ids('usher'::public.app_role))
        or public.is_administrator()
      )
  )
)
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.church_id = public.current_church_id()
      and p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and (
        p.branch_id in (select public.user_branch_ids('usher'::public.app_role))
        or public.is_administrator()
      )
  )
);

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
  select * into v_prog
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
    exists(
      select 1
      from public.user_branch_ids('usher'::public.app_role) b
      where b = v_prog.branch_id
    )
    or public.is_administrator()
  ) into v_branch_ok;

  if not v_branch_ok or v_prog.created_by <> auth.uid() then
    raise exception 'Not authorized to submit this record';
  end if;

  if v_prog.state not in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  ) then
    raise exception 'Record in state % cannot be submitted', v_prog.state;
  end if;

  if v_prog.version <> p_expected_version then
    raise exception 'CONFLICT: record has been modified (expected version %, found %)',
      p_expected_version, v_prog.version;
  end if;

  v_previous_state := v_prog.state;

  update public.programme_occurrences
     set state = 'submitted',
         version = version + 1
   where id = p_programme_id
   returning * into v_prog;

  insert into public.signoffs (
    programme_id, record_kind, action, actor_id, record_version
  )
  values (
    p_programme_id, 'attendance', 'submit', auth.uid(), v_prog.version
  );

  insert into public.audit_events (
    church_id, actor_id, entity_table, entity_id, action, previous_value, new_value
  )
  values (
    v_prog.church_id,
    auth.uid(),
    'programme_occurrences',
    p_programme_id,
    'submit',
    jsonb_build_object('state', v_previous_state, 'version', p_expected_version),
    jsonb_build_object('state', 'submitted', 'version', v_prog.version)
  );

  return v_prog;
end;
$$;

revoke all on function public.submit_attendance(uuid, integer) from public, anon;
grant execute on function public.submit_attendance(uuid, integer) to authenticated;

-- RLS controls which rows a client may reach, but table-level UPDATE/INSERT
-- grants previously allowed a crafted client to include workflow fields in
-- the write. Restrict authenticated clients to the exact draft-entry columns
-- used by src/lib/data/programmes.ts. SECURITY DEFINER workflow RPCs execute
-- as their owner and are unaffected by these client grants.
revoke insert, update on table public.programme_occurrences from anon;
revoke insert, update on table public.programme_occurrences from authenticated;

grant insert (
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
) on public.programme_occurrences to authenticated;

grant update (
  programme_name,
  classification,
  preacher_id,
  sermon_topic,
  notes
) on public.programme_occurrences to authenticated;
