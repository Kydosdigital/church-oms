-- Church OMS
-- Migration 0040: covering indexes for online-giving reconciliation foreign keys.
--
-- Supabase's performance advisor reports these four FKs as unindexed.
-- Adding the indexes changes query/delete planning only; it does not change
-- authorization or reconciliation semantics.

create index if not exists idx_online_giving_batches_imported_by
  on public.online_giving_batches (imported_by);

create index if not exists idx_online_giving_transactions_batch_id
  on public.online_giving_transactions (batch_id);

create index if not exists idx_online_giving_transactions_matched_by
  on public.online_giving_transactions (matched_by)
  where matched_by is not null;

create index if not exists idx_online_giving_transactions_matched_category_id
  on public.online_giving_transactions (matched_category_id)
  where matched_category_id is not null;
