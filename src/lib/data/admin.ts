"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BranchValues, VenueValues, ServiceTypeValues, UserRoleValues, InviteUserValues } from "@/lib/validations/admin";
import type { Branch, Venue, ServiceType, UserRoleAssignment } from "@/types/domain";

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

/** Assigns a role (optionally branch-scoped, optionally with finance
 * visibility) to an existing user. Re-submitting the same user/role/branch
 * combination updates finance_permission on the existing row rather than
 * duplicating it.
 *
 * Not done via a plain `.upsert(..., { onConflict: "user_id,role,branch_id" })`:
 * Postgres unique constraints treat every NULL as distinct from every other
 * NULL, so the "all branches" case (branch_id = null) would never be
 * recognized as a conflict and each re-assignment would insert a new row
 * instead of updating the first one. Looking the row up explicitly (matching
 * NULL with `.is()`) sidesteps that. */
export async function assignUserRole(input: UserRoleValues) {
  const { supabase } = await requireAdministrator();
  const branchId = input.branch_id ?? null;

  let existingQuery = supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", input.user_id)
    .eq("role", input.role);
  existingQuery = branchId ? existingQuery.eq("branch_id", branchId) : existingQuery.is("branch_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  const error = existing
    ? (await supabase.from("user_roles").update({ finance_permission: input.finance_permission }).eq("id", existing.id)).error
    : (
        await supabase.from("user_roles").insert({
          user_id: input.user_id,
          role: input.role,
          branch_id: branchId,
          finance_permission: input.finance_permission,
        })
      ).error;

  if (error) throw error;
  revalidatePath("/admin/users");
}

export async function removeUserRole(roleAssignmentId: string) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase.from("user_roles").delete().eq("id", roleAssignmentId);
  if (error) throw error;
  revalidatePath("/admin/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const { supabase } = await requireAdministrator();
  const { error } = await supabase.from("app_users").update({ active }).eq("id", userId);
  if (error) throw error;
  revalidatePath("/admin/users");
}

/**
 * Invites a brand-new person by email using Supabase Auth's admin API — the
 * only path that can create an auth.users row (and, via the
 * handle_new_auth_user trigger, the matching app_users row) without the
 * person self-signing-up first. Requires SUPABASE_SERVICE_ROLE_KEY to be set
 * server-side (see src/lib/supabase/admin.ts); throws a clear error if not.
 * Administrator status is checked with the RLS-bound client BEFORE touching
 * the service-role client, since the service-role client bypasses RLS.
 */
export async function inviteUser(input: InviteUserValues) {
  const { supabase, userId } = await requireAdministrator();
  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", userId).single();
  if (!profile?.church_id) throw new Error("User is not assigned to a church yet");

  const admin = createAdminClient();
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.full_name },
  });
  if (error) throw error;

  // handle_new_auth_user() creates the app_users row automatically, but it
  // doesn't know full_name at that point (it defaults from the auth email) —
  // and the invited person's church_id needs to be set to the inviter's
  // church so they land in the same tenant, not a fresh one.
  if (invited.user) {
    await admin
      .from("app_users")
      .update({ full_name: input.full_name, church_id: profile.church_id })
      .eq("id", invited.user.id);
  }

  revalidatePath("/admin/users");
}

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
    .select("id, full_name, email, active, user_roles(id, user_id, role, branch_id, finance_permission, branches(name))")
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
