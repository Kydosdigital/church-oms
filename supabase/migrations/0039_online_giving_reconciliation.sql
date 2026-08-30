-- Church OMS
-- Migration 0039: branch-scoped online-giving reconciliation.
--
-- Purpose:
--   Import online payment/bank statement rows for one branch, match them to
--   programme occurrences, and compare those imported totals with the online
--   giving recorded in Church OMS.
--
-- Privacy:
--   Reconciliation stores only transaction date, amount, source/reference and
--   matching metadata. Donor names are deliberately not part of this model.
--
-- Access:
--   This is historical finance data. Every read and mutation requires explicit
--   finance-history permission for the transaction's branch.

create table if not exists public.online_giving_batches (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  source_name text not null,
  file_name text,
  file_hash text not null,
  row_count integer not null check (row_count > 0),
  total_amount numeric(14,2) not null check (total_amount > 0),
  imported_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (church_id, file_hash)
);

create table if not exists public.online_giving_transactions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.online_giving_batches(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  source_name text not null,
  transaction_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  reference text,
  external_id text,

  status text not null default 'unmatched'
    check (status in ('unmatched', 'matched', 'ignored')),
  matched_programme_id uuid references public.programme_occurrences(id) on delete set null,
  matched_category_id uuid references public.offering_categories(id) on delete set null,
  match_note text,
  matched_by uuid references public.app_users(id),
  matched_at timestamptz,

  created_at timestamptz not null default now(),

  constraint online_giving_match_shape check (
    (
      status = 'matched'
      and matched_programme_id is not null
      and matched_by is not null
      and matched_at is not null
    )
    or (
      status in ('unmatched', 'ignored')
      and matched_programme_id is null
      and matched_category_id is null
    )
  )
);

create unique index if not exists uq_online_giving_external_transaction
  on public.online_giving_transactions (church_id, source_name, external_id)
  where external_id is not null;

create index if not exists idx_online_giving_batches_branch_created
  on public.online_giving_batches (branch_id, created_at desc);

create index if not exists idx_online_giving_transactions_branch_status_date
  on public.online_giving_transactions (branch_id, status, transaction_date desc);

create index if not exists idx_online_giving_transactions_programme
  on public.online_giving_transactions (matched_programme_id)
  where matched_programme_id is not null;

alter table public.online_giving_batches enable row level security;
alter table public.online_giving_transactions enable row level security;

drop policy if exists online_giving_batches_select on public.online_giving_batches;
create policy online_giving_batches_select
on public.online_giving_batches
for select
to authenticated
using (
  church_id = private.current_church_id()
  and branch_id in (select private.user_branch_ids())
  and private.has_finance_history_permission(branch_id)
);

drop policy if exists online_giving_transactions_select on public.online_giving_transactions;
create policy online_giving_transactions_select
on public.online_giving_transactions
for select
to authenticated
using (
  church_id = private.current_church_id()
  and branch_id in (select private.user_branch_ids())
  and private.has_finance_history_permission(branch_id)
);

-- Mutations go through validated RPCs below. Keep browser clients read-only at
-- table level so branch/church/match metadata cannot be crafted directly.
revoke all on public.online_giving_batches from public, anon;
revoke all on public.online_giving_transactions from public, anon;
revoke insert, update, delete on public.online_giving_batches from authenticated;
revoke insert, update, delete on public.online_giving_transactions from authenticated;
grant select on public.online_giving_batches to authenticated;
grant select on public.online_giving_transactions to authenticated;

create or replace function public.import_online_giving_batch(
  p_branch_id uuid,
  p_source_name text,
  p_file_name text,
  p_file_hash text,
  p_transactions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_church_id uuid;
  v_source_name text := btrim(coalesce(p_source_name, ''));
  v_file_hash text := lower(btrim(coalesce(p_file_hash, '')));
  v_row_count integer;
  v_total numeric(14,2);
  v_batch_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select b.church_id
    into v_church_id
  from public.branches b
  join public.app_users u
    on u.id = v_user_id
   and u.active = true
   and u.church_id = b.church_id
  where b.id = p_branch_id
    and b.active = true;

  if v_church_id is null then
    raise exception 'Branch is not available for this user';
  end if;

  if not private.has_finance_history_permission(p_branch_id) then
    raise exception 'Finance-history permission is required for reconciliation';
  end if;

  if length(v_source_name) < 2 or length(v_source_name) > 80 then
    raise exception 'Enter a valid payment source name';
  end if;

  if v_file_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Statement fingerprint is invalid';
  end if;

  if p_transactions is null or jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'Transactions must be a JSON array';
  end if;

  select count(*)::integer, coalesce(sum(t.amount), 0)::numeric(14,2)
    into v_row_count, v_total
  from jsonb_to_recordset(p_transactions) as t(
    transaction_date date,
    amount numeric,
    reference text,
    external_id text
  );

  if v_row_count < 1 then
    raise exception 'The statement contains no transactions';
  end if;

  if v_row_count > 5000 then
    raise exception 'A statement may contain at most 5000 transactions';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_transactions) as t(
      transaction_date date,
      amount numeric,
      reference text,
      external_id text
    )
    where t.transaction_date is null
       or t.transaction_date > current_date + 1
       or t.amount is null
       or t.amount <= 0
       or length(coalesce(t.reference, '')) > 500
       or length(coalesce(t.external_id, '')) > 200
  ) then
    raise exception 'One or more statement rows are invalid';
  end if;

  begin
    insert into public.online_giving_batches (
      church_id,
      branch_id,
      source_name,
      file_name,
      file_hash,
      row_count,
      total_amount,
      imported_by
    )
    values (
      v_church_id,
      p_branch_id,
      v_source_name,
      nullif(btrim(coalesce(p_file_name, '')), ''),
      v_file_hash,
      v_row_count,
      v_total,
      v_user_id
    )
    returning id into v_batch_id;
  exception
    when unique_violation then
      raise exception 'This statement has already been imported';
  end;

  begin
    insert into public.online_giving_transactions (
      batch_id,
      church_id,
      branch_id,
      source_name,
      transaction_date,
      amount,
      reference,
      external_id
    )
    select
      v_batch_id,
      v_church_id,
      p_branch_id,
      v_source_name,
      t.transaction_date,
      t.amount::numeric(14,2),
      nullif(btrim(coalesce(t.reference, '')), ''),
      nullif(btrim(coalesce(t.external_id, '')), '')
    from jsonb_to_recordset(p_transactions) as t(
      transaction_date date,
      amount numeric,
      reference text,
      external_id text
    );
  exception
    when unique_violation then
      raise exception 'One or more external transaction IDs were already imported';
  end;

  insert into public.audit_events (
    church_id,
    actor_id,
    entity_table,
    entity_id,
    action,
    new_value
  )
  values (
    v_church_id,
    v_user_id,
    'online_giving_batches',
    v_batch_id,
    'online_giving_import',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'source_name', v_source_name,
      'row_count', v_row_count,
      'total_amount', v_total
    )
  );

  return v_batch_id;
end;
$$;

revoke all on function public.import_online_giving_batch(
  uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.import_online_giving_batch(
  uuid, text, text, text, jsonb
) to authenticated;

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
     ) then
    raise exception 'The selected offering category does not belong to this church';
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
       select 1 from private.user_branch_ids() branch_id
       where branch_id = v_tx.branch_id
     ) then
    raise exception 'Not authorized to reconcile this transaction';
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
    jsonb_build_object(
      'status', v_tx.status,
      'programme_id', v_tx.matched_programme_id,
      'category_id', v_tx.matched_category_id
    ),
    jsonb_build_object('status', 'unmatched')
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
       select 1 from private.user_branch_ids() branch_id
       where branch_id = v_tx.branch_id
     ) then
    raise exception 'Not authorized to reconcile this transaction';
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
    jsonb_build_object(
      'status', v_tx.status,
      'programme_id', v_tx.matched_programme_id
    ),
    jsonb_build_object(
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
