-- Church Operations Management System
-- Migration 0001: Core schema
-- Follows PRD section 10.1 (Key entities) and 10.2 (Data modelling decisions).
-- Design principles:
--   * Offering categories are ROWS, not columns (CFG-01..CFG-08).
--   * Money uses NUMERIC(14,2) fixed-decimal precision, never float (section 6.1).
--   * Every mutable/approvable record carries a version column for optimistic
--     concurrency (section 7.1) and an append-only audit_events trail (7.2).
--   * Branch identifiers exist from day one, even for single-branch churches (10.2).

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. Church, branches, venues
-- ============================================================================

create table if not exists churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency_code text not null default 'USD',
  timezone text not null default 'UTC',
  reporting_year_start_month smallint not null default 1 check (reporting_year_start_month between 1 and 12),
  finance_requires_independent_verification boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  name text not null,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, name)
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  default_capacity integer not null check (default_capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, name)
);

-- ============================================================================
-- 2. Service types / programme types (SRV-07)
-- ============================================================================

create table if not exists service_types (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  name text not null,                 -- e.g. Sunday Service, Midweek Service, Prayer Meeting
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (church_id, name)
);

-- ============================================================================
-- 3. Users, roles, branch assignments
-- ============================================================================

-- Mirrors auth.users (Supabase) 1:1. Created via trigger on signup.
create table if not exists app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  church_id uuid references churches(id) on delete set null,
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type app_role as enum (
  'usher',
  'attendance_verifier',
  'treasurer',
  'finance_verifier',
  'pastor',
  'administrator'
);

-- A user may hold more than one role (section 2). Roles are branch-scoped,
-- except church-wide leadership which uses branch_id = null to mean "all branches".
create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  role app_role not null,
  branch_id uuid references branches(id) on delete cascade, -- null = all branches (church-wide)
  -- Finance visibility is explicit and independent of role (2.1: an admin does not
  -- automatically get finance access). This flag gates REV-08 style checks even
  -- for roles that would otherwise imply finance (treasurer/finance_verifier still
  -- need it set true; it exists so it can be revoked without removing the role).
  finance_permission boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, role, branch_id)
);

create index if not exists idx_user_roles_user on user_roles(user_id);
create index if not exists idx_user_roles_branch on user_roles(branch_id);

-- ============================================================================
-- 4. Preachers / guest ministers (SRV-04)
-- ============================================================================

create table if not exists ministers (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  full_name text not null,
  is_guest boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. Programme occurrences (the parent record, 10.2)
-- ============================================================================

create type programme_classification as enum ('routine', 'special_event');

create type record_state as enum (
  'draft',
  'submitted',
  'returned',
  'verified',
  'reopened'
);

create table if not exists programme_occurrences (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete restrict,
  service_type_id uuid not null references service_types(id) on delete restrict,
  venue_id uuid not null references venues(id) on delete restrict,

  programme_date date not null,
  programme_name text not null,
  classification programme_classification not null default 'routine',

  preacher_id uuid references ministers(id) on delete set null,
  sermon_topic text,

  venue_capacity_snapshot integer not null, -- copied from venue at creation; capacity may change over time
  notes text,

  state record_state not null default 'draft',
  version integer not null default 1, -- optimistic concurrency (7.1)

  -- Duplicate override (SRV-08)
  duplicate_override boolean not null default false,
  duplicate_override_reason text,

  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint venue_capacity_positive check (venue_capacity_snapshot > 0)
);

create index if not exists idx_programme_branch_date on programme_occurrences(branch_id, programme_date);
create index if not exists idx_programme_state on programme_occurrences(state);

-- Soft duplicate guard (SRV-08): same branch + service type + date is *warned*,
-- not hard-blocked, because an authorized override is allowed. We enforce the
-- warning in application logic (a unique index would block valid double-services
-- like AM/PM). A partial unique index prevents *silent* duplicates only when no
-- override was recorded.
create unique index if not exists uq_programme_no_override
  on programme_occurrences(branch_id, service_type_id, programme_date)
  where duplicate_override = false;

create table if not exists programme_guest_ministers (
  programme_id uuid not null references programme_occurrences(id) on delete cascade,
  minister_id uuid not null references ministers(id) on delete cascade,
  primary key (programme_id, minister_id)
);

-- ============================================================================
-- 6. Attendance & outcomes (ATT-01..ATT-08)
-- ============================================================================

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null unique references programme_occurrences(id) on delete cascade,

  men_count integer not null default 0 check (men_count >= 0),
  women_count integer not null default 0 check (women_count >= 0),
  teenagers_count integer not null default 0 check (teenagers_count >= 0),
  children_count integer not null default 0 check (children_count >= 0),

  -- Total attendance = men + women + teenagers + children (ATT-02).
  -- Generated column: cannot be directly edited, always consistent.
  total_attendance integer generated always as
    (men_count + women_count + teenagers_count + children_count) stored,

  first_timers_count integer not null default 0 check (first_timers_count >= 0),
  converts_count integer not null default 0 check (converts_count >= 0),
  new_births_count integer not null default 0 check (new_births_count >= 0),
  weddings_count integer not null default 0 check (weddings_count >= 0),

  -- Exception handling (ATT-06/ATT-07): capacity + outcome-exceeds-attendance
  -- warnings must be acknowledged with a note before submission.
  capacity_exception_note text,
  outcome_exception_note text,

  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 7. Revenue categories (configurable, CFG-01..CFG-08) & projects
-- ============================================================================

create type offering_category_type as enum ('general', 'project', 'special');

create table if not exists offering_categories (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  name text not null,
  description text,
  category_type offering_category_type not null default 'general',
  active boolean not null default true,

  -- CFG-03: appears for all services, or only selected programme/service types.
  applies_to_all_service_types boolean not null default true,

  -- CFG-04: used categories cannot be deleted, only deactivated. Enforced by
  -- application logic + the fact revenue_entries has a FK with on delete restrict.
  is_default boolean not null default false, -- Tithe / General Offering / Building Project seed rows

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, name)
);

create table if not exists offering_category_service_types (
  category_id uuid not null references offering_categories(id) on delete cascade,
  service_type_id uuid not null references service_types(id) on delete cascade,
  primary key (category_id, service_type_id)
);

create table if not exists fundraising_projects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null unique references offering_categories(id) on delete cascade,
  target_amount numeric(14,2) check (target_amount is null or target_amount > 0),
  start_date date,
  end_date date,
  -- 7: "a project may continue receiving entries after its end date only with
  -- authorized override"
  accepting_entries_after_end_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 8. Revenue entries (REV-01..REV-08)
-- ============================================================================

create type payment_channel as enum ('physical', 'online');

create table if not exists revenue_entries (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programme_occurrences(id) on delete cascade,
  category_id uuid not null references offering_categories(id) on delete restrict,

  physical_amount numeric(14,2) not null default 0 check (physical_amount >= 0),
  online_amount numeric(14,2) not null default 0 check (online_amount >= 0),
  -- Category total = physical + online (REV-04), generated for consistency.
  category_total numeric(14,2) generated always as (physical_amount + online_amount) stored,

  notes text,

  state record_state not null default 'draft',
  version integer not null default 1,

  created_by uuid not null references app_users(id),
  updated_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (programme_id, category_id)
);

create index if not exists idx_revenue_programme on revenue_entries(programme_id);
create index if not exists idx_revenue_category on revenue_entries(category_id);

-- ============================================================================
-- 9. Submissions, verifications (APR-01..APR-08)
-- ============================================================================

create type record_kind as enum ('attendance', 'finance');

-- One row per sign-off action. Full audit of who submitted/verified/returned/
-- reopened a given programme's attendance or finance side, including the
-- exact record version at the time (APR-02, APR-03, business rule "Signature").
create table if not exists signoffs (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programme_occurrences(id) on delete cascade,
  record_kind record_kind not null,

  action text not null check (action in ('submit', 'verify', 'return', 'reopen')),
  actor_id uuid not null references app_users(id),
  record_version integer not null,
  reason text, -- required by application logic for return/reopen (APR-04, APR-06)

  created_at timestamptz not null default now()
);

create index if not exists idx_signoffs_programme on signoffs(programme_id, record_kind);

-- ============================================================================
-- 10. Audit log (append-only, 7.2)
-- ============================================================================

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  actor_id uuid references app_users(id),
  entity_table text not null,
  entity_id uuid not null,
  action text not null, -- create, update, submit, return, verify, reopen, export, admin_config
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_entity on audit_events(entity_table, entity_id);
create index if not exists idx_audit_church on audit_events(church_id, created_at desc);

-- ============================================================================
-- 11. updated_at trigger helper
-- ============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'churches','branches','venues','app_users','programme_occurrences',
    'attendance_records','offering_categories','fundraising_projects',
    'revenue_entries'
  ] loop
    execute format(
      'drop trigger if exists trg_set_updated_at on %I; create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;
