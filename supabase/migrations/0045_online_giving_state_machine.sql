-- Church OMS
-- Migration 0045: enforce the online-giving reconciliation state machine.
--
-- The UI only lets unmatched transactions be matched or ignored, and only
-- matched/ignored transactions be restored to unmatched. The privileged RPCs
-- now enforce that workflow too, so direct API calls cannot bypass it.
--
-- Match notes and ignore reasons are also bounded at the database layer to the
-- same 500-character maximum already exposed by the UI.

alter table public.online_giving_transactions
  drop constraint if exists online_giving_match_note_length;

alter table public.online_giving_transactions
  add constraint online_giving_match_note_length
  check (
    match_note is null
    or char_length(match_note) <= 500
  );

create or replace function public.match_online_giving_transaction(
  p_transaction_id uuid,
  p_programme_id uuid,
  p_category_id uuid default null,
  p_note text default null
)
returns public.online_giving_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx public.online_giving_transactions;
  v_programme public.programme_occurrences;
  v_result public.online_giving_transactions;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_note is not null and length(v_note) > 500 then
    raise exception 'Match notes may contain at most 500 characters';
  end if;

  select t.*
    into v_tx
  from public.online_giving_transactions t
  where t.id = p_transaction_id
  for update;

  if v_tx.id is null then
    raise exception 'Online transaction not found';
  end if;

  if v_tx.church_id is distinct from private.current_church_id()
     or not private.has_finance_history_permission(v_tx.branch_id)
     or not exists (
       select 1
       from private.user_branch_ids() branch_id
       where branch_id = v_tx.branch_id
     ) then
    raise exception 'Not authorized to reconcile this transaction';
  end if;

  if v_tx.status <> 'unmatched' then
    raise exception 'Only unmatched transactions can be matched';
  end if;

  select p.*
    into v_programme
  from public.programme_occurrences p
  where p.id = p_programme_id;

  if v_programme.id is null
     or v_programme.church_id is distinct from v_tx.church_id
     or v_programme.branch_id is distinct from v_tx.branch_id then
    raise exception 'The selected service must belong to the same church and branch';
  end if;

  if p_category_id is not null
     and not exists (
       select 1
       from public.offering_categories c
       where c.id = p_category_id
         and c.church_id = v_tx.church_id
         and c.active = true
         and (
           c.applies_to_all_service_types = true
           or exists (
             select 1
             from public.offering_category_service_types cs
             where cs.category_id = c.id
               and cs.service_type_id = v_programme.service_type_id
           )
         )
         and (
           c.category_type <> 'project'::public.offering_category_type
           or exists (
             select 1
             from public.fundraising_projects fp
             where fp.category_id = c.id
               and (
                 fp.start_date is null
                 or v_programme.programme_date >= fp.start_date
               )
               and (
                 fp.end_date is null
                 or v_programme.programme_date <= fp.end_date
                 or fp.accepting_entries_after_end_override = true
               )
           )
         )
     ) then
    raise exception
      'The selected offering category is not available for this service and programme date';
  end if;

  update public.online_giving_transactions
     set status = 'matched',
         matched_programme_id = p_programme_id,
         matched_category_id = p_category_id,
         match_note = v_note,
         matched_by = v_user_id,
         matched_at = now()
   where id = p_transaction_id
   returning * into v_result;

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
    v_tx.church_id,
    v_user_id,
    'online_giving_transactions',
    p_transaction_id,
    'online_giving_match',
    pg_catalog.jsonb_build_object(
      'status', v_tx.status,
      'programme_id', v_tx.matched_programme_id,
      'category_id', v_tx.matched_category_id
    ),
    pg_catalog.jsonb_build_object(
      'status', 'matched',
      'programme_id', p_programme_id,
      'category_id', p_category_id
    )
  );

  return v_result;
end;
$$;

revoke all on function public.match_online_giving_transaction(
  uuid, uuid, uuid, text
) from public, anon;
grant execute on function public.match_online_giving_transaction(
  uuid, uuid, uuid, text
) to authenticated;

create or replace function public.unmatch_online_giving_transaction(
  p_transaction_id uuid
)
returns public.online_giving_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx public.online_giving_transactions;
  v_result public.online_giving_transactions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select t.*
    into v_tx
  from public.online_giving_transactions t
  where t.id = p_transaction_id
  for update;

  if v_tx.id is null then
    raise exception 'Online transaction not found';
  end if;

  if v_tx.church_id is distinct from private.current_church_id()
     or not private.has_finance_history_permission(v_tx.branch_id)
     or not exists (
       select 1
       from private.user_branch_ids() branch_id
       where branch_id = v_tx.branch_id
     ) then
    raise exception 'Not authorized to reconcile this transaction';
  end if;

  if v_tx.status not in ('matched', 'ignored') then
    raise exception 'This transaction is already unmatched';
  end if;

  update public.online_giving_transactions
     set status = 'unmatched',
         matched_programme_id = null,
         matched_category_id = null,
         match_note = null,
         matched_by = null,
         matched_at = null
   where id = p_transaction_id
   returning * into v_result;

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
    v_tx.church_id,
    v_user_id,
    'online_giving_transactions',
    p_transaction_id,
    'online_giving_unmatch',
    pg_catalog.jsonb_build_object(
      'status', v_tx.status,
      'programme_id', v_tx.matched_programme_id,
      'category_id', v_tx.matched_category_id,
      'reason', case when v_tx.status = 'ignored' then v_tx.match_note else null end
    ),
    pg_catalog.jsonb_build_object('status', 'unmatched')
  );

  return v_result;
end;
$$;

revoke all on function public.unmatch_online_giving_transaction(uuid)
  from public, anon;
grant execute on function public.unmatch_online_giving_transaction(uuid)
  to authenticated;

create or replace function public.ignore_online_giving_transaction(
  p_transaction_id uuid,
  p_reason text
)
returns public.online_giving_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx public.online_giving_transactions;
  v_result public.online_giving_transactions;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if length(v_reason) < 3 then
    raise exception 'Add a reason for ignoring this transaction';
  end if;

  if length(v_reason) > 500 then
    raise exception 'Ignore reasons may contain at most 500 characters';
  end if;

  select t.*
    into v_tx
  from public.online_giving_transactions t
  where t.id = p_transaction_id
  for update;

  if v_tx.id is null then
    raise exception 'Online transaction not found';
  end if;

  if v_tx.church_id is distinct from private.current_church_id()
     or not private.has_finance_history_permission(v_tx.branch_id)
     or not exists (
       select 1
       from private.user_branch_ids() branch_id
       where branch_id = v_tx.branch_id
     ) then
    raise exception 'Not authorized to reconcile this transaction';
  end if;

  if v_tx.status <> 'unmatched' then
    raise exception 'Only unmatched transactions can be ignored';
  end if;

  update public.online_giving_transactions
     set status = 'ignored',
         matched_programme_id = null,
         matched_category_id = null,
         match_note = v_reason,
         matched_by = v_user_id,
         matched_at = now()
   where id = p_transaction_id
   returning * into v_result;

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
    v_tx.church_id,
    v_user_id,
    'online_giving_transactions',
    p_transaction_id,
    'online_giving_ignore',
    pg_catalog.jsonb_build_object(
      'status', v_tx.status,
      'programme_id', v_tx.matched_programme_id,
      'category_id', v_tx.matched_category_id
    ),
    pg_catalog.jsonb_build_object(
      'status', 'ignored',
      'reason', v_reason
    )
  );

  return v_result;
end;
$$;

revoke all on function public.ignore_online_giving_transaction(uuid, text)
  from public, anon;
grant execute on function public.ignore_online_giving_transaction(uuid, text)
  to authenticated;
