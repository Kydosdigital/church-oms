"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BranchValues,
  VenueValues,
  ServiceTypeValues,
  ChurchSettingsValues,
} from "@/lib/validations/admin";
import type { Branch, Venue, ServiceType, UserRoleAssignment, Church } from "@/types/domain";

/**
 * Every mutation below still relies on RLS for the actual authorization
 * decision (branches_write / venues_write / service_types_write /
 * user_roles_admin_write all require is_administrator() — see
 * supabase/migrations/0002_rls_policies.sql). This check exists only to fail
 * fast with a readable message instead of a bare Postgres RLS error.
 */
async function requireAdministrator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (roles ?? []).some((r) => r.role === "administrator");
  if (!isAdmin) throw new Error("Only administrators can manage this");

  return { supabase, userId: user.id };
}

// ----------------------------------------------------------------------------
// Branches & venues
// ----------------------------------------------------------------------------

export async function createBranch(input: BranchValues) {
  const { supabase, userId } = await requireAdministrator();

  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", userId).single();
  if (!profile?.church_id) throw new Error("User is not assigned to a church yet");

  const { error } = await supabase.from("branches").insert({
    church_id: profile.church_id,
    name: input.name,
    is_primary: input.is_primary,
  });
  if (error) throw error;

  revalidatePath("/admin/branches");
}

export async function updateBranch(branchId: string, input: BranchValues) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase
    .from("branches")
    .update({ name: input.name, is_primary: input.is_primary })
    .eq("id", branchId);
  if (error) throw error;
  revalidatePath("/admin/branches");
}

export async function setBranchActive(branchId: string, active: boolean) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase.from("branches").update({ active }).eq("id", branchId);
  if (error) throw error;
  revalidatePath("/admin/branches");
}

export async function createVenue(input: VenueValues) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase.from("venues").insert({
    branch_id: input.branch_id,
    name: input.name,
    default_capacity: input.default_capacity,
  });
  if (error) throw error;
  revalidatePath("/admin/branches");
}

export async function updateVenue(venueId: string, input: Pick<VenueValues, "name" | "default_capacity">) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase
    .from("venues")
    .update({ name: input.name, default_capacity: input.default_capacity })
    .eq("id", venueId);
  if (error) throw error;
  revalidatePath("/admin/branches");
}

export async function setVenueActive(venueId: string, active: boolean) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase.from("venues").update({ active }).eq("id", venueId);
  if (error) throw error;
  revalidatePath("/admin/branches");
}

// ----------------------------------------------------------------------------
// Service types
// ----------------------------------------------------------------------------

export async function listServiceTypesAll(): Promise<ServiceType[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("service_types").select("*").order("name");
  return (data ?? []) as ServiceType[];
}

export async function createServiceType(input: ServiceTypeValues) {
  const { supabase, userId } = await requireAdministrator();
  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", userId).single();
  if (!profile?.church_id) throw new Error("User is not assigned to a church yet");

  const { error } = await supabase.from("service_types").insert({ church_id: profile.church_id, name: input.name });
  if (error) throw error;
  revalidatePath("/admin/branches");
}

export async function renameServiceType(serviceTypeId: string, name: string) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase.from("service_types").update({ name }).eq("id", serviceTypeId);
  if (error) throw error;
  revalidatePath("/admin/branches");
}

export async function setServiceTypeActive(serviceTypeId: string, active: boolean) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase.from("service_types").update({ active }).eq("id", serviceTypeId);
  if (error) throw error;
  revalidatePath("/admin/branches");
}

// ----------------------------------------------------------------------------
// Users & roles
// ----------------------------------------------------------------------------

// User role assignment, removal, activation and invitations intentionally live
// in src/lib/data/user-access.ts and src/lib/data/invitations.ts. Keep one
// authorization path for these sensitive mutations rather than retaining older
// service-role alternatives in this general admin module.

export interface UserRoleRow extends UserRoleAssignment {
  branches: { name: string } | null;
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  active: boolean;
  user_roles: UserRoleRow[];
}

export async function listUsersWithRoles(): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_users")
    .select(
      "id, full_name, email, active, user_roles(id, user_id, role, branch_id, finance_permission, finance_history_permission, branches(name))"
    )
    .order("full_name");
  return (data ?? []) as unknown as AdminUserRow[];
}

export interface BranchWithVenuesRow extends Branch {
  venues: Venue[];
}

export async function listBranchesWithVenues(): Promise<BranchWithVenuesRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("branches").select("*, venues(*)").order("name");
  return (data ?? []) as unknown as BranchWithVenuesRow[];
}

// ----------------------------------------------------------------------------
// Audit log
// ----------------------------------------------------------------------------

export interface AuditEventRow {
  id: string;
  actor_id: string | null;
  entity_table: string;
  entity_id: string;
  action: string;
  previous_value: unknown;
  new_value: unknown;
  created_at: string;
  app_users: { full_name: string } | null;
}

export interface AuditLogFilters {
  entityTable?: string;
  action?: string;
  from?: string;
  to?: string;
}

/** audit_select RLS (supabase/migrations/0002) already restricts this to
 * administrators of the row's own church — no extra check needed here beyond
 * what the query itself returns (an empty result for anyone else). */
export async function listAuditEvents(filters: AuditLogFilters = {}): Promise<AuditEventRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("audit_events")
    .select("id, actor_id, entity_table, entity_id, action, previous_value, new_value, created_at, app_users(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.entityTable) query = query.eq("entity_table", filters.entityTable);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data } = await query;
  return (data ?? []) as unknown as AuditEventRow[];
}

export async function listAuditEntityTables(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_events").select("entity_table").limit(1000);
  const set = new Set((data ?? []).map((r) => r.entity_table));
  return Array.from(set).sort();
}

// ----------------------------------------------------------------------------
// Church settings
// ----------------------------------------------------------------------------

export async function getChurchSettings(): Promise<Church | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", user.id).single();
  if (!profile?.church_id) return null;

  const { data } = await supabase.from("churches").select("*").eq("id", profile.church_id).single();
  return (data as Church) ?? null;
}

/** churches_update RLS is already administrator-gated
 * (supabase/migrations/0002_rls_policies.sql), so no schema changes were
 * needed for this screen — just the UI and this action. */
export async function updateChurchSettings(input: ChurchSettingsValues) {
  const { supabase, userId } = await requireAdministrator();
  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", userId).single();
  if (!profile?.church_id) throw new Error("User is not assigned to a church yet");

  const { error } = await supabase
    .from("churches")
    .update({
      name: input.name,
      currency_code: input.currency_code,
      timezone: input.timezone,
      locale_code: input.locale_code,
      reporting_year_start_month: input.reporting_year_start_month,
      finance_requires_independent_verification: input.finance_requires_independent_verification,
    })
    .eq("id", profile.church_id);
  if (error) throw error;

  revalidatePath("/admin/settings");
}
