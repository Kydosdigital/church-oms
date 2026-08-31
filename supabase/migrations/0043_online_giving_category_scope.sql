-- Church OMS
-- Migration 0043: align online-giving category matching with finance-entry scope.
--
-- Reconciliation is allowed to match a transaction to a service without a
-- category. When a category is supplied, it must satisfy the same new-entry
-- rules as normal finance capture: active, same church, applicable to the
-- service type, and within the fundraising-project window for that programme.

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
         match_note = nullif(btrim(coalesce(p_note, '')), ''),
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
    jsonb_build_object(
      'status', v_tx.status,
      'programme_id', v_tx.matched_programme_id,
      'category_id', v_tx.matched_category_id
    ),
    jsonb_build_object(
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
