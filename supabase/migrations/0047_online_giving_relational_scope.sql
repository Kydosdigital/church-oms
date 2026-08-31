-- Church OMS
-- Migration 0047: enforce relational tenant scope for online-giving rows.
--
-- online_giving_batches stores both branch_id and church_id, while
-- online_giving_transactions repeats those fields alongside batch_id for
-- efficient RLS and filtering. These composite constraints ensure those
-- denormalized scope values can never drift apart.

alter table public.branches
  drop constraint if exists branches_id_church_id_key;

alter table public.branches
  add constraint branches_id_church_id_key
  unique (id, church_id);

alter table public.online_giving_batches
  drop constraint if exists online_giving_batches_branch_church_fkey;

alter table public.online_giving_batches
  add constraint online_giving_batches_branch_church_fkey
  foreign key (branch_id, church_id)
  references public.branches (id, church_id)
  on delete restrict;

alter table public.online_giving_batches
  drop constraint if exists online_giving_batches_id_church_branch_key;

alter table public.online_giving_batches
  add constraint online_giving_batches_id_church_branch_key
  unique (id, church_id, branch_id);

alter table public.online_giving_transactions
  drop constraint if exists online_giving_transactions_batch_scope_fkey;

alter table public.online_giving_transactions
  add constraint online_giving_transactions_batch_scope_fkey
  foreign key (batch_id, church_id, branch_id)
  references public.online_giving_batches (id, church_id, branch_id)
  on delete cascade;
