-- Church OMS
-- Migration 0042: ensure the online-giving summary runs as the caller.
--
-- Migration 0041 was verified against the hosted project before merge. This
-- follow-up makes the hosted database and fresh installs converge on the safer
-- read-only execution model, where existing table RLS remains in force.

alter function public.online_giving_programme_summary(uuid)
  security invoker;
