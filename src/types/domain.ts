/**
 * Hand-authored domain types mirroring the SQL schema in supabase/migrations.
 * Keep in sync with the migrations; once the real Supabase project is wired
 * up, prefer the generated Database type for row shapes and use these mainly
 * for enums, computed/view-model shapes, and form values.
 */

export type AppRole =
  | "usher"
  | "attendance_verifier"
  | "treasurer"
  | "finance_verifier"
  | "pastor"
  | "administrator";

export type RecordState = "draft" | "submitted" | "returned" | "verified" | "reopened";

export type ProgrammeClassification = "routine" | "special_event";

export type OfferingCategoryType = "general" | "project" | "special";

export type PaymentChannel = "physical" | "online";

export type RecordKind = "attendance" | "finance";

export interface Church {
  id: string;
  name: string;
  currency_code: string;
  timezone: string;
  reporting_year_start_month: number;
  finance_requires_independent_verification: boolean;
}

export interface Branch {
  id: string;
  church_id: string;
  name: string;
  is_primary: boolean;
  active: boolean;
}

export interface Venue {
  id: string;
  branch_id: string;
  name: string;
  default_capacity: number;
  active: boolean;
}

export interface ServiceType {
  id: string;
  church_id: string;
  name: string;
  active: boolean;
}

export interface AppUser {
  id: string;
  church_id: string | null;
  full_name: string;
  email: string;
  active: boolean;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role: AppRole;
  branch_id: string | null;
  finance_permission: boolean;
}

export interface Minister {
  id: string;
  church_id: string;
  full_name: string;
  is_guest: boolean;
  active: boolean;
}

export interface ProgrammeOccurrence {
  id: string;
  church_id: string;
  branch_id: string;
  service_type_id: string;
  venue_id: string;
  programme_date: string; // ISO date
  programme_name: string;
  classification: ProgrammeClassification;
  preacher_id: string | null;
  sermon_topic: string | null;
  venue_capacity_snapshot: number;
  notes: string | null;
  state: RecordState;
  version: number;
  duplicate_override: boolean;
  duplicate_override_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  programme_id: string;
  men_count: number;
  women_count: number;
  teenagers_count: number;
  children_count: number;
  total_attendance: number; // generated column
  first_timers_count: number;
  converts_count: number;
  new_births_count: number;
  weddings_count: number;
  capacity_exception_note: string | null;
  outcome_exception_note: string | null;
}

export interface OfferingCategory {
  id: string;
  church_id: string;
  name: string;
  description: string | null;
  category_type: OfferingCategoryType;
  active: boolean;
  applies_to_all_service_types: boolean;
  is_default: boolean;
}

export interface FundraisingProject {
  id: string;
  category_id: string;
  target_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  accepting_entries_after_end_override: boolean;
}

export interface RevenueEntry {
  id: string;
  programme_id: string;
  category_id: string;
  physical_amount: number;
  online_amount: number;
  category_total: number; // generated column
  notes: string | null;
  state: RecordState;
  version: number;
  created_by: string;
  updated_by: string | null;
}

export interface Signoff {
  id: string;
  programme_id: string;
  record_kind: RecordKind;
  action: "submit" | "verify" | "return" | "reopen";
  actor_id: string;
  record_version: number;
  reason: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  church_id: string | null;
  actor_id: string | null;
  entity_table: string;
  entity_id: string;
  action: string;
  previous_value: unknown;
  new_value: unknown;
  created_at: string;
}

/** Attendance form values before totals are computed server-side. */
export interface AttendanceCounts {
  men_count: number;
  women_count: number;
  teenagers_count: number;
  children_count: number;
  first_timers_count: number;
  converts_count: number;
  new_births_count: number;
  weddings_count: number;
}

export const ATTENDANCE_ROLE_LABELS: Record<AppRole, string> = {
  usher: "Usher",
  attendance_verifier: "Attendance Verifier",
  treasurer: "Treasurer / Accountant",
  finance_verifier: "Finance Verifier",
  pastor: "Pastor",
  administrator: "Administrator",
};

export const RECORD_STATE_LABELS: Record<RecordState, string> = {
  draft: "Draft",
  submitted: "Submitted",
  returned: "Returned",
  verified: "Verified",
  reopened: "Reopened",
};
