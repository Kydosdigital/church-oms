-- Church Operations Management System
-- Migration 0002: Row-level security
-- Enforces: branch-scoped access, explicit finance permission separate from
-- role/admin (2.1), submitter-cannot-verify-own-record, locked/verified
-- records immutable except via admin reopen, append-only audit log.

alter table churches enable row level security;
alter table branches enable row level security;
alter table venues enable row level security;
alter table service_types enable row level security;
alter table app_users enable row level security;
alter table user_roles enable row level security;
alter table ministers enable row level security;
alter table programme_occurrences enable row level security;
alter table programme_guest_ministers enable row level security;
alter table attendance_records enable row level security;
alter table offering_categories enable row level security;
alter table offering_category_service_types enable row level security;
alter table fundraising_projects enable row level security;
alter table revenue_entries enable row level security;
alter table signoffs enable row level security;
alter table audit_events enable row level security;

-- ----------------------------------------------------------------------------
-- Helper functions (security definer, read-only) used throughout policies.
-- ----------------------------------------------------------------------------

create or replace function current_church_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select church_id from app_users where id = auth.uid();
$$;

-- All branch ids a user can act on for a given role; null branch_id in
-- user_roles means "all branches" (church-wide leadership, section 2.2).
create or replace function user_branch_ids(p_role app_role default null)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select b.id
  from branches b
  where b.church_id = current_church_id()
    and (
      exists (
        select 1 from user_roles ur
        where ur.user_id = auth.uid()
          and ur.branch_id is null
          and (p_role is null or ur.role = p_role)
      )
      or exists (
        select 1 from user_roles ur
        where ur.user_id = auth.uid()
          and ur.branch_id = b.id
          and (p_role is null or ur.role = p_role)
      )
    );
$$;

create or replace function has_role(p_role app_role, p_branch_id uuid default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = p_role
      and (ur.branch_id is null or p_branch_id is null or ur.branch_id = p_branch_id)
  );
$$;

create or replace function is_administrator()
returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('administrator');
$$;

-- Finance permission is explicit (2.1) — never implied by administrator status.
create or replace function has_finance_permission(p_branch_id uuid default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.finance_permission = true
      and (ur.branch_id is null or p_branch_id is null or ur.branch_id = p_branch_id)
  );
$$;

-- ----------------------------------------------------------------------------
-- churches: readable by any member; only administrators can change settings.
-- ----------------------------------------------------------------------------

create policy churches_select on churches for select
  using (id = current_church_id());

create policy churches_update on churches for update
  using (id = current_church_id() and is_administrator())
  with check (id = current_church_id() and is_administrator());

-- ----------------------------------------------------------------------------
-- branches / venues / service_types: read within church; write = administrator.
-- ----------------------------------------------------------------------------

create policy branches_select on branches for select
  using (church_id = current_church_id());
create policy branches_write on branches for all
  using (church_id = current_church_id() and is_administrator())
  with check (church_id = current_church_id() and is_administrator());

create policy venues_select on venues for select
  using (branch_id in (select id from branches where church_id = current_church_id()));
create policy venues_write on venues for all
  using (branch_id in (select id from branches where church_id = current_church_id()) and is_administrator())
  with check (branch_id in (select id from branches where church_id = current_church_id()) and is_administrator());

create policy service_types_select on service_types for select
  using (church_id = current_church_id());
create policy service_types_write on service_types for all
  using (church_id = current_church_id() and is_administrator())
  with check (church_id = current_church_id() and is_administrator());

-- ----------------------------------------------------------------------------
-- app_users / user_roles: users see their own church's directory; only
-- administrators manage roles. An administrator does NOT gain finance
-- visibility through this table (2.1) — that is governed separately by
-- has_finance_permission() on the finance tables below.
-- ----------------------------------------------------------------------------

create policy app_users_select on app_users for select
  using (church_id = current_church_id());
create policy app_users_update_self on app_users for update
  using (id = auth.uid())
  with check (id = auth.uid());
create policy app_users_admin_write on app_users for all
  using (church_id = current_church_id() and is_administrator())
  with check (church_id = current_church_id() and is_administrator());

create policy user_roles_select on user_roles for select
  using (
    user_id = auth.uid()
    or exists (select 1 from app_users u where u.id = user_roles.user_id and u.church_id = current_church_id() and is_administrator())
  );
create policy user_roles_admin_write on user_roles for all
  using (exists (select 1 from app_users u where u.id = user_roles.user_id and u.church_id = current_church_id()) and is_administrator())
  with check (exists (select 1 from app_users u where u.id = user_roles.user_id and u.church_id = current_church_id()) and is_administrator());

-- ----------------------------------------------------------------------------
-- ministers
-- ----------------------------------------------------------------------------

create policy ministers_select on ministers for select
  using (church_id = current_church_id());
create policy ministers_write on ministers for all
  using (church_id = current_church_id() and (is_administrator() or has_role('usher')))
  with check (church_id = current_church_id());

-- ----------------------------------------------------------------------------
-- programme_occurrences: branch-scoped. Ushers create/edit their own drafts
-- and returned records; verified records are locked to everyone except an
-- administrator performing an explicit reopen (done via a SECURITY DEFINER
-- RPC — see 0003_functions.sql — not a direct UPDATE, so this policy simply
-- blocks direct edits once verified).
-- ----------------------------------------------------------------------------

create policy programme_select on programme_occurrences for select
  using (branch_id in (select user_branch_ids()));

create policy programme_insert on programme_occurrences for insert
  with check (
    branch_id in (select user_branch_ids('usher'))
    and created_by = auth.uid()
  );

create policy programme_update on programme_occurrences for update
  using (
    branch_id in (select user_branch_ids('usher'))
    and state in ('draft', 'returned')
    and created_by = auth.uid()
  )
  with check (
    branch_id in (select user_branch_ids('usher'))
    and created_by = auth.uid()
  );

-- Verifiers transition state via RPC (attendance_verify / attendance_return),
-- which runs as security definer, so no separate verifier UPDATE policy is
-- granted here — this keeps "verified = locked" enforceable in one place.

-- ----------------------------------------------------------------------------
-- attendance_records: same visibility as the parent programme, no finance
-- gating needed (attendance is not financial data).
-- ----------------------------------------------------------------------------

create policy attendance_select on attendance_records for select
  using (programme_id in (select id from programme_occurrences where branch_id in (select user_branch_ids())));

create policy attendance_write on attendance_records for all
  using (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and state in ('draft', 'returned')
        and created_by = auth.uid()
    )
  )
  with check (
    programme_id in (
      select id from programme_occurrences
      where branch_id in (select user_branch_ids('usher'))
        and created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- offering_categories / fundraising_projects: readable to finance-permitted
-- users and administrators; writable only by administrators (CFG-01).
-- ----------------------------------------------------------------------------

create policy categories_select on offering_categories for select
  using (church_id = current_church_id() and (has_finance_permission() or is_administrator()));
create policy categories_write on offering_categories for all
  using (church_id = current_church_id() and is_administrator())
  with check (church_id = current_church_id() and is_administrator());

create policy category_service_types_select on offering_category_service_types for select
  using (category_id in (select id from offering_categories where church_id = current_church_id()));
create policy category_service_types_write on offering_category_service_types for all
  using (is_administrator())
  with check (is_administrator());

create policy projects_select on fundraising_projects for select
  using (
    category_id in (select id from offering_categories where church_id = current_church_id())
    and (has_finance_permission() or is_administrator())
  );
create policy projects_write on fundraising_projects for all
  using (category_id in (select id from offering_categories where church_id = current_church_id()) and is_administrator())
  with check (category_id in (select id from offering_categories where church_id = current_church_id()) and is_administrator());

-- ----------------------------------------------------------------------------
-- revenue_entries: strictly finance-permission gated (REV-08). Ordinary
-- ushers get zero visibility, even into their own branch's totals.
-- ----------------------------------------------------------------------------

create policy revenue_select on revenue_entries for select
  using (
    programme_id in (
      select p.id from programme_occurrences p
      where p.branch_id in (select user_branch_ids())
    )
    and has_finance_permission()
  );

create policy revenue_write on revenue_entries for all
  using (
    programme_id in (select p.id from programme_occurrences p where p.branch_id in (select user_branch_ids()))
    and has_finance_permission()
    and state in ('draft', 'returned')
  )
  with check (
    programme_id in (select p.id from programme_occurrences p where p.branch_id in (select user_branch_ids()))
    and has_finance_permission()
  );

-- ----------------------------------------------------------------------------
-- signoffs: insert-only via RPCs; readable to anyone who can see the parent
-- programme (attendance) or has finance permission (finance signoffs).
-- ----------------------------------------------------------------------------

create policy signoffs_select on signoffs for select
  using (
    programme_id in (select id from programme_occurrences where branch_id in (select user_branch_ids()))
    and (record_kind = 'attendance' or has_finance_permission())
  );

-- No direct insert/update/delete policy: all sign-off actions go through
-- SECURITY DEFINER RPCs in 0003_functions.sql, which validate the separation-
-- of-duties rule (submitter != verifier) before writing.

-- ----------------------------------------------------------------------------
-- audit_events: append-only, readable by administrators only (7.2).
-- ----------------------------------------------------------------------------

create policy audit_select on audit_events for select
  using (church_id = current_church_id() and is_administrator());

-- No update/delete policy exists for any role — audit_events is append-only
-- even to administrators. Inserts happen via SECURITY DEFINER trigger/RPCs.
