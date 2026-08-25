-- Church Operations Management System
-- Migration 0004: Seed helper — provisions a new church with sane MVP defaults.
-- Call select provision_new_church('My Church', 'USD', 'Africa/Lagos') once per
-- tenant (e.g. from an onboarding flow), then invite the first administrator.

create or replace function provision_new_church(
  p_name text,
  p_currency text default 'USD',
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_church_id uuid;
  v_branch_id uuid;
begin
  insert into churches (name, currency_code, timezone)
  values (p_name, p_currency, p_timezone)
  returning id into v_church_id;

  insert into branches (church_id, name, is_primary)
  values (v_church_id, 'Main Branch', true)
  returning id into v_branch_id;

  insert into venues (branch_id, name, default_capacity)
  values (v_branch_id, 'Main Auditorium', 200);

  insert into service_types (church_id, name) values
    (v_church_id, 'Sunday Service'),
    (v_church_id, 'Midweek Service'),
    (v_church_id, 'Prayer Meeting');

  -- Default offering categories (CFG-06, REV-02)
  insert into offering_categories (church_id, name, category_type, is_default, description) values
    (v_church_id, 'Tithe', 'general', true, 'Regular tithe offering.'),
    (v_church_id, 'General Offering', 'general', true, 'Standard service offering.'),
    (v_church_id, 'Building Project Offering', 'project', true, 'Default project category (renameable).');

  -- Extra suggested categories from CFG-07, created inactive so the church
  -- can opt in without a fixed schema column for each one.
  insert into offering_categories (church_id, name, category_type, active, description) values
    (v_church_id, 'Missions', 'special', false, 'Missions and outreach giving.'),
    (v_church_id, 'Welfare', 'special', false, 'Welfare and benevolence fund.'),
    (v_church_id, 'Thanksgiving', 'special', false, 'Thanksgiving offering.'),
    (v_church_id, 'Harvest', 'special', false, 'Harvest offering.'),
    (v_church_id, 'Youth Ministry', 'special', false, 'Youth ministry fund.'),
    (v_church_id, 'Equipment Fund', 'project', false, 'Equipment purchase fund.'),
    (v_church_id, 'Community Outreach', 'special', false, 'Community outreach fund.');

  return v_church_id;
end;
$$;
