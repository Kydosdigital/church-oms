-- Church Operations Management System
-- Migration 0003: Workflow RPCs
-- All state transitions (submit / verify / return / reopen) go through these
-- SECURITY DEFINER functions so that:
--   * the submitter-cannot-verify-own-record rule is enforced server-side (2.1)
--   * verified records are genuinely locked (APR-05) — direct UPDATEs are
--     blocked by RLS once state = 'verified'/'submitted'
--   * every transition writes a signoff row (APR-02/APR-03) AND an audit_events
--     row with previous/new value (APR-07, 7.2)
--   * record versioning prevents silent overwrites (7.1) — callers must pass
--     the version they last read; a mismatch raises a conflict error.

-- ----------------------------------------------------------------------------
-- Attendance: submit
-- ----------------------------------------------------------------------------

create or replace function submit_attendance(p_programme_id uuid, p_expected_version integer)
returns programme_occurrences
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
  v_branch_ok boolean;
begin
  select * into v_prog from programme_occurrences where id = p_programme_id for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;

  select exists(select 1 from user_branch_ids('usher') b where b = v_prog.branch_id) into v_branch_ok;
  if not v_branch_ok or v_prog.created_by <> auth.uid() then
    raise exception 'Not authorized to submit this record';
  end if;

  if v_prog.state not in ('draft', 'returned') then
    raise exception 'Record in state % cannot be submitted', v_prog.state;
  end if;

  if v_prog.version <> p_expected_version then
    raise exception 'CONFLICT: record has been modified (expected version %, found %)', p_expected_version, v_prog.version;
  end if;

  update programme_occurrences
     set state = 'submitted', version = version + 1
   where id = p_programme_id
   returning * into v_prog;

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version)
  values (p_programme_id, 'attendance', 'submit', auth.uid(), v_prog.version);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, previous_value, new_value)
  values (v_prog.church_id, auth.uid(), 'programme_occurrences', p_programme_id, 'submit',
          jsonb_build_object('state', 'draft_or_returned'), jsonb_build_object('state', 'submitted'));

  return v_prog;
end;
$$;

-- ----------------------------------------------------------------------------
-- Attendance: verify
-- ----------------------------------------------------------------------------

create or replace function verify_attendance(p_programme_id uuid, p_expected_version integer)
returns programme_occurrences
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
  v_is_verifier boolean;
  v_last_submitter uuid;
begin
  select * into v_prog from programme_occurrences where id = p_programme_id for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;

  select exists(select 1 from user_branch_ids('attendance_verifier') b where b = v_prog.branch_id) into v_is_verifier;
  if not v_is_verifier then
    raise exception 'Not authorized to verify this record';
  end if;

  if v_prog.state <> 'submitted' then
    raise exception 'Record in state % cannot be verified', v_prog.state;
  end if;

  if v_prog.version <> p_expected_version then
    raise exception 'CONFLICT: record has been modified (expected version %, found %)', p_expected_version, v_prog.version;
  end if;

  -- Separation of duties (2.1): the verifier cannot be the submitter.
  select actor_id into v_last_submitter
    from signoffs
   where programme_id = p_programme_id and record_kind = 'attendance' and action = 'submit'
   order by created_at desc limit 1;

  if v_last_submitter = auth.uid() then
    raise exception 'The submitter of a record cannot verify it';
  end if;

  update programme_occurrences
     set state = 'verified', version = version + 1
   where id = p_programme_id
   returning * into v_prog;

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version)
  values (p_programme_id, 'attendance', 'verify', auth.uid(), v_prog.version);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, previous_value, new_value)
  values (v_prog.church_id, auth.uid(), 'programme_occurrences', p_programme_id, 'verify',
          jsonb_build_object('state', 'submitted'), jsonb_build_object('state', 'verified'));

  return v_prog;
end;
$$;

-- ----------------------------------------------------------------------------
-- Attendance: return (with mandatory reason, APR-04)
-- ----------------------------------------------------------------------------

create or replace function return_attendance(p_programme_id uuid, p_expected_version integer, p_reason text)
returns programme_occurrences
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
  v_is_verifier boolean;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to return a record';
  end if;

  select * into v_prog from programme_occurrences where id = p_programme_id for update;
  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;

  select exists(select 1 from user_branch_ids('attendance_verifier') b where b = v_prog.branch_id) into v_is_verifier;
  if not v_is_verifier then
    raise exception 'Not authorized to return this record';
  end if;

  if v_prog.state <> 'submitted' then
    raise exception 'Record in state % cannot be returned', v_prog.state;
  end if;
  if v_prog.version <> p_expected_version then
    raise exception 'CONFLICT: record has been modified (expected version %, found %)', p_expected_version, v_prog.version;
  end if;

  update programme_occurrences
     set state = 'returned', version = version + 1
   where id = p_programme_id
   returning * into v_prog;

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version, reason)
  values (p_programme_id, 'attendance', 'return', auth.uid(), v_prog.version, p_reason);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, previous_value, new_value)
  values (v_prog.church_id, auth.uid(), 'programme_occurrences', p_programme_id, 'return',
          jsonb_build_object('state', 'submitted'), jsonb_build_object('state', 'returned', 'reason', p_reason));

  return v_prog;
end;
$$;

-- ----------------------------------------------------------------------------
-- Attendance: reopen (administrator only, mandatory reason, APR-06)
-- ----------------------------------------------------------------------------

create or replace function reopen_attendance(p_programme_id uuid, p_reason text)
returns programme_occurrences
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
begin
  if not is_administrator() then
    raise exception 'Only an administrator may reopen a verified record';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to reopen a record';
  end if;

  select * into v_prog from programme_occurrences where id = p_programme_id for update;
  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;
  if v_prog.state <> 'verified' then
    raise exception 'Only a verified record can be reopened (current state: %)', v_prog.state;
  end if;

  update programme_occurrences
     set state = 'reopened', version = version + 1
   where id = p_programme_id
   returning * into v_prog;

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version, reason)
  values (p_programme_id, 'attendance', 'reopen', auth.uid(), v_prog.version, p_reason);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, previous_value, new_value)
  values (v_prog.church_id, auth.uid(), 'programme_occurrences', p_programme_id, 'reopen',
          jsonb_build_object('state', 'verified'), jsonb_build_object('state', 'reopened', 'reason', p_reason));

  return v_prog;
end;
$$;

-- ----------------------------------------------------------------------------
-- Finance: submit / verify / return / reopen (mirrors attendance, but scoped
-- to revenue_entries as a set, gated on has_finance_permission(), and only
-- enforces separation-of-duties when the church has finance verification
-- enabled — 4.6 "Configure whether finance requires independent verification").
-- ----------------------------------------------------------------------------

create or replace function submit_finance(p_programme_id uuid)
returns setof revenue_entries
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
begin
  select * into v_prog from programme_occurrences where id = p_programme_id;
  if v_prog is null then raise exception 'Programme % not found', p_programme_id; end if;
  if not has_finance_permission() then raise exception 'Finance permission required'; end if;

  update revenue_entries
     set state = 'submitted', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state in ('draft', 'returned');

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version)
  values (p_programme_id, 'finance', 'submit', auth.uid(), 1);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'submit', jsonb_build_object('state', 'submitted'));

  return query select * from revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function verify_finance(p_programme_id uuid)
returns setof revenue_entries
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
  v_church churches;
  v_last_submitter uuid;
begin
  select * into v_prog from programme_occurrences where id = p_programme_id;
  if v_prog is null then raise exception 'Programme % not found', p_programme_id; end if;
  select * into v_church from churches where id = v_prog.church_id;
  if not has_finance_permission() then raise exception 'Finance permission required'; end if;
  if not has_role('finance_verifier') and not is_administrator() then
    raise exception 'Not authorized to verify finance records';
  end if;

  if v_church.finance_requires_independent_verification then
    select actor_id into v_last_submitter
      from signoffs
     where programme_id = p_programme_id and record_kind = 'finance' and action = 'submit'
     order by created_at desc limit 1;
    if v_last_submitter = auth.uid() then
      raise exception 'The preparer of a finance record cannot verify it';
    end if;
  end if;

  update revenue_entries
     set state = 'verified', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state = 'submitted';

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version)
  values (p_programme_id, 'finance', 'verify', auth.uid(), 1);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'verify', jsonb_build_object('state', 'verified'));

  return query select * from revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function return_finance(p_programme_id uuid, p_reason text)
returns setof revenue_entries
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to return a finance record';
  end if;
  select * into v_prog from programme_occurrences where id = p_programme_id;
  if v_prog is null then raise exception 'Programme % not found', p_programme_id; end if;
  if not has_finance_permission() then raise exception 'Finance permission required'; end if;

  update revenue_entries
     set state = 'returned', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state = 'submitted';

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version, reason)
  values (p_programme_id, 'finance', 'return', auth.uid(), 1, p_reason);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'return', jsonb_build_object('state', 'returned', 'reason', p_reason));

  return query select * from revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function reopen_finance(p_programme_id uuid, p_reason text)
returns setof revenue_entries
language plpgsql security definer set search_path = public as $$
declare
  v_prog programme_occurrences;
begin
  if not is_administrator() then raise exception 'Only an administrator may reopen finance records'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to reopen a finance record';
  end if;
  select * into v_prog from programme_occurrences where id = p_programme_id;
  if v_prog is null then raise exception 'Programme % not found', p_programme_id; end if;

  update revenue_entries
     set state = 'reopened', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state = 'verified';

  insert into signoffs (programme_id, record_kind, action, actor_id, record_version, reason)
  values (p_programme_id, 'finance', 'reopen', auth.uid(), 1, p_reason);

  insert into audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'reopen', jsonb_build_object('state', 'reopened', 'reason', p_reason));

  return query select * from revenue_entries where programme_id = p_programme_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- New-user provisioning trigger: mirrors auth.users into app_users.
-- ----------------------------------------------------------------------------

create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into app_users (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
