-- Church Operations Management System
-- Migration 0008: Performance hardening (addresses Supabase advisor findings)
--   * Foreign key columns without a covering index (slow joins/deletes at scale)
--   * RLS policies calling auth.uid() directly get re-evaluated per row; wrap
--     in (select auth.uid()) so Postgres can evaluate it once per statement.
-- Note: "multiple_permissive_policies" (a select policy + a "for all" policy
-- both applying to SELECT) is left as-is for now — fixing it means splitting
-- ~15 admin "for all" policies into insert/update/delete, which is lower
-- priority than correctness/security at this stage of the build.

-- ----------------------------------------------------------------------------
-- Missing FK indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_app_users_church_id on app_users(church_id);
create index if not exists idx_audit_events_actor_id on audit_events(actor_id);
create index if not exists idx_ministers_church_id on ministers(church_id);
create index if not exists idx_offering_category_service_types_service_type_id
  on offering_category_service_types(service_type_id);
create index if not exists idx_programme_guest_ministers_minister_id
  on programme_guest_ministers(minister_id);
create index if not exists idx_programme_occurrences_church_id on programme_occurrences(church_id);
create index if not exists idx_programme_occurrences_created_by on programme_occurrences(created_by);
create index if not exists idx_programme_occurrences_preacher_id on programme_occurrences(preacher_id);
create index if not exists idx_programme_occurrences_service_type_id on programme_occurrences(service_type_id);
create index if not exists idx_programme_occurrences_venue_id on programme_occurrences(venue_id);
create index if not exists idx_revenue_entries_created_by on revenue_entries(created_by);
create index if not exists idx_revenue_entries_updated_by on revenue_entries(updated_by);
create index if not exists idx_signoffs_actor_id on signoffs(actor_id);

-- ----------------------------------------------------------------------------
-- auth_rls_initplan: rewrite policies with a direct auth.uid() call to use
-- (select auth.uid()) so the planner evaluates it once per statement instead
-- of once per row.
-- ----------------------------------------------------------------------------

drop policy if exists app_users_update_self on app_users;
create policy app_users_update_self on app_users for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists user_roles_select on user_roles;
create policy user_roles_select on user_roles for select
  using (
    user_id = (select auth.uid())
    or exists (select 1 from app_users u where u.id = user_roles.user_id and u.church_id = current_church_id() and is_administrator())
  );

drop policy if exists programme_insert on programme_occurrences;
create policy programme_insert on programme_occurrences for insert
  with check (
    branch_id in (select user_branch_ids('usher'))
    and created_by = (select auth.uid())
  );

drop policy if exists programme_update on programme_occurrences;
create policy programme_update on programme_occurrences for update
  using (
    branch_id in (select user_branch_ids('usher'))
    and state in ('draft', 'returned')
    and created_by = (select auth.uid())
  )
  with check (
    branch_id in (select user_branch_ids('usher'))
    and created_by = (select auth.uid())
  );

drop policy if exists programme_guest_ministers_write on programme_guest_ministers;
create policy programme_guest_ministers_write on programme_guest_ministers for all
  using (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and state in ('draft', 'returned')
        and created_by = (select auth.uid())
    )
  )
  with check (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and created_by = (select auth.uid())
    )
  );

drop policy if exists attendance_write on attendance_records;
create policy attendance_write on attendance_records for all
  using (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and state in ('draft', 'returned')
        and created_by = (select auth.uid())
    )
  )
  with check (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and created_by = (select auth.uid())
    )
  );
