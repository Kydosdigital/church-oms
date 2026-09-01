-- Church OMS
-- Migration 0048: cover composite online-giving foreign keys.
--
-- Migration 0047 introduced composite foreign keys to enforce tenant-scope
-- coherence. These indexes cover the referencing columns in the same order,
-- avoiding slower joins and parent-row checks as reconciliation data grows.

create index if not exists idx_online_giving_batches_branch_church
  on public.online_giving_batches (branch_id, church_id);

create index if not exists idx_online_giving_transactions_batch_scope
  on public.online_giving_transactions (batch_id, church_id, branch_id);
