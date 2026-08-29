-- Church OMS
-- Migration 0030: safe advisor-driven performance improvements.
--
-- No authorization semantics change here. This migration only:
-- 1) adds covering indexes for four live-counter foreign keys that Supabase's
--    database advisor reports as unindexed, and
-- 2) evaluates auth.uid() once for the Platform Owner self-select policy
--    instead of once per candidate row.

create index if not exists idx_attendance_counter_entries_user_id
  on public.attendance_counter_entries (user_id);

create index if not exists idx_attendance_counter_sessions_branch_id
  on public.attendance_counter_sessions (branch_id);

create index if not exists idx_attendance_counter_sessions_opened_by
  on public.attendance_counter_sessions (opened_by);

create index if not exists idx_attendance_counter_sessions_closed_by
  on public.attendance_counter_sessions (closed_by);

drop policy if exists platform_admins_self_select
  on public.platform_admins;

create policy platform_admins_self_select
on public.platform_admins
for select
to authenticated
using (
  user_id = (select auth.uid())
  and active = true
);
