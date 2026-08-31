-- Church OMS
-- Migration 0046: normalize online-giving source identity for external IDs.
--
-- Payment/bank source names are free text and stored for display. Duplicate
-- transaction protection must not treat case-only or surrounding-whitespace
-- variants such as "Stripe" and " stripe " as different providers.

drop index if exists public.uq_online_giving_external_transaction;

create unique index uq_online_giving_external_transaction
  on public.online_giving_transactions (
    church_id,
    lower(btrim(source_name)),
    external_id
  )
  where external_id is not null;
