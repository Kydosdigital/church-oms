-- Church OMS
-- Migration 0022: bind privileged workflow RPC authorization to the target
-- programme's tenant and branch.
--
-- SECURITY DEFINER bypasses table RLS, so every privileged workflow function
-- must independently prove that the caller is allowed to act on the specific
-- programme being supplied. The original finance functions checked whether the
-- caller had a finance permission somewhere, but did not bind that permission
-- to the target church/branch. Reopen functions similarly checked admin status
-- without checking that the programme belonged to the caller's church.

create or replace function public.reopen_attendance(p_programme_id uuid, p_reason text)
returns public.programme_occurrences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to reopen a record';
  end if;

  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id
  for update;

  if v_prog is null then
    raise exception 'Programme % not found', p_programme_id;
  end if;
  if v_prog.church_id is distinct from public.current_church_id() then
    raise exception 'Not authorized to reopen this record';
  end if;
  if not public.is_administrator() then
    raise exception 'Only an administrator may reopen a verified record';
  end if;
  if v_prog.state <> 'verified' then
    raise exception 'Only a verified record can be reopened (current state: %)', v_prog.state;
  end if;

  update public.programme_occurrences
     set state = 'reopened', version = version + 1
   where id = p_programme_id
   returning * into v_prog;

  insert into public.signoffs (programme_id, record_kind, action, actor_id, record_version, reason)
  values (p_programme_id, 'attendance', 'reopen', auth.uid(), v_prog.version, p_reason);

  insert into public.audit_events (church_id, actor_id, entity_table, entity_id, action, previous_value, new_value)
  values (v_prog.church_id, auth.uid(), 'programme_occurrences', p_programme_id, 'reopen',
          jsonb_build_object('state', 'verified'), jsonb_build_object('state', 'reopened', 'reason', p_reason));

  return v_prog;
end;
$$;

create or replace function public.submit_finance(p_programme_id uuid)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
begin
  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id;

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

  update public.revenue_entries
     set state = 'submitted', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state in ('draft', 'returned');

  insert into public.signoffs (programme_id, record_kind, action, actor_id, record_version)
  values (p_programme_id, 'finance', 'submit', auth.uid(), 1);

  insert into public.audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'submit', jsonb_build_object('state', 'submitted'));

  return query select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function public.verify_finance(p_programme_id uuid)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
  v_church public.churches;
  v_last_submitter uuid;
begin
  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id;

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

  select * into v_church from public.churches where id = v_prog.church_id;

  if v_church.finance_requires_independent_verification then
    select actor_id into v_last_submitter
      from public.signoffs
     where programme_id = p_programme_id
       and record_kind = 'finance'
       and action = 'submit'
     order by created_at desc
     limit 1;

    if v_last_submitter = auth.uid() then
      raise exception 'The preparer of a finance record cannot verify it';
    end if;
  end if;

  update public.revenue_entries
     set state = 'verified', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state = 'submitted';

  insert into public.signoffs (programme_id, record_kind, action, actor_id, record_version)
  values (p_programme_id, 'finance', 'verify', auth.uid(), 1);

  insert into public.audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'verify', jsonb_build_object('state', 'verified'));

  return query select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function public.return_finance(p_programme_id uuid, p_reason text)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to return a finance record';
  end if;

  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id;

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

  update public.revenue_entries
     set state = 'returned', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state = 'submitted';

  insert into public.signoffs (programme_id, record_kind, action, actor_id, record_version, reason)
  values (p_programme_id, 'finance', 'return', auth.uid(), 1, p_reason);

  insert into public.audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'return', jsonb_build_object('state', 'returned', 'reason', p_reason));

  return query select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

create or replace function public.reopen_finance(p_programme_id uuid, p_reason text)
returns setof public.revenue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog public.programme_occurrences;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to reopen a finance record';
  end if;

  select * into v_prog
  from public.programme_occurrences
  where id = p_programme_id;

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

  update public.revenue_entries
     set state = 'reopened', version = version + 1, updated_by = auth.uid()
   where programme_id = p_programme_id and state = 'verified';

  insert into public.signoffs (programme_id, record_kind, action, actor_id, record_version, reason)
  values (p_programme_id, 'finance', 'reopen', auth.uid(), 1, p_reason);

  insert into public.audit_events (church_id, actor_id, entity_table, entity_id, action, new_value)
  values (v_prog.church_id, auth.uid(), 'revenue_entries', p_programme_id, 'reopen', jsonb_build_object('state', 'reopened', 'reason', p_reason));

  return query select * from public.revenue_entries where programme_id = p_programme_id;
end;
$$;

-- CREATE OR REPLACE preserves existing EXECUTE privileges, but make the API
-- boundary explicit so this migration remains safe if privilege defaults change.
revoke all on function public.reopen_attendance(uuid, text) from public, anon;
revoke all on function public.submit_finance(uuid) from public, anon;
revoke all on function public.verify_finance(uuid) from public, anon;
revoke all on function public.return_finance(uuid, text) from public, anon;
revoke all on function public.reopen_finance(uuid, text) from public, anon;

grant execute on function public.reopen_attendance(uuid, text) to authenticated;
grant execute on function public.submit_finance(uuid) to authenticated;
grant execute on function public.verify_finance(uuid) to authenticated;
grant execute on function public.return_finance(uuid, text) to authenticated;
grant execute on function public.reopen_finance(uuid, text) to authenticated;
