-- Church OMS
-- Migration 0044: make online-giving duplicate fingerprints server-owned.
--
-- The original import RPC accepted a SHA-256 calculated in the browser and
-- trusted that value for duplicate detection. An authorised caller could
-- therefore replay the same transaction payload with a different 64-character
-- hash. This migration computes a canonical SHA-256 from the normalized rows
-- inside PostgreSQL. Row order, JSON key order, harmless whitespace and numeric
-- formatting no longer affect the fingerprint.
--
-- A four-argument RPC is the new application surface. The original five-
-- argument signature remains as a compatibility wrapper, but its supplied hash
-- is ignored and cannot influence duplicate detection.

create or replace function public.import_online_giving_batch(
  p_branch_id uuid,
  p_source_name text,
  p_file_name text,
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
  v_file_hash text;
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

  if p_transactions is null or jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'Transactions must be a JSON array';
  end if;

  select count(*)::integer, coalesce(sum(t.amount), 0)::numeric(14,2)
    into v_row_count, v_total
  from pg_catalog.jsonb_to_recordset(p_transactions) as t(
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
    from pg_catalog.jsonb_to_recordset(p_transactions) as t(
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

  -- Hash the values exactly as they will be persisted. Sorting makes the
  -- fingerprint independent of CSV row order while jsonb gives a stable,
  -- unambiguous representation of nulls and text values.
  select pg_catalog.encode(
    extensions.digest(
      coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'transaction_date',
              pg_catalog.to_char(t.transaction_date, 'YYYY-MM-DD'),
            'amount',
              pg_catalog.to_char(
                pg_catalog.round(t.amount, 2),
                'FM999999999999990.00'
              ),
            'reference',
              nullif(pg_catalog.btrim(coalesce(t.reference, '')), ''),
            'external_id',
              nullif(pg_catalog.btrim(coalesce(t.external_id, '')), '')
          )
          order by
            t.transaction_date,
            pg_catalog.round(t.amount, 2),
            coalesce(
              nullif(pg_catalog.btrim(coalesce(t.reference, '')), ''),
              ''
            ),
            coalesce(
              nullif(pg_catalog.btrim(coalesce(t.external_id, '')), ''),
              ''
            )
        )::text,
        '[]'
      ),
      'sha256'
    ),
    'hex'
  )
    into v_file_hash
  from pg_catalog.jsonb_to_recordset(p_transactions) as t(
    transaction_date date,
    amount numeric,
    reference text,
    external_id text
  );

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
      raise exception 'These statement transactions have already been imported';
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
    from pg_catalog.jsonb_to_recordset(p_transactions) as t(
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
    pg_catalog.jsonb_build_object(
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
  uuid, text, text, jsonb
) from public, anon;
grant execute on function public.import_online_giving_batch(
  uuid, text, text, jsonb
) to authenticated;

-- Backward-compatible legacy signature. The browser-supplied hash is
-- deliberately not used.
create or replace function public.import_online_giving_batch(
  p_branch_id uuid,
  p_source_name text,
  p_file_name text,
  p_file_hash text,
  p_transactions jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select public.import_online_giving_batch(
    p_branch_id,
    p_source_name,
    p_file_name,
    p_transactions
  );
$$;

revoke all on function public.import_online_giving_batch(
  uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.import_online_giving_batch(
  uuid, text, text, text, jsonb
) to authenticated;
