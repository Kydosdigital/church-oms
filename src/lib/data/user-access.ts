"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ManagedUserRoleValues } from "@/lib/validations/admin";

async function getAccessActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("app_users").select("church_id").eq("id", user.id).single(),
  ]);

  const roleNames = (roles ?? []).map((row) => row.role as string);
  const isSuperAdmin = roleNames.includes("super_admin");
  const isAdministrator = isSuperAdmin || roleNames.includes("administrator");

  if (!isAdministrator) throw new Error("Only administrators can manage users");
  if (!profile?.church_id) throw new Error("User is not assigned to a church");

  return {
    supabase,
    churchId: profile.church_id as string,
    isSuperAdmin,
  };
}

async function assertTargetInChurch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetUserId: string,
  churchId: string
) {
  const { data: target } = await supabase
    .from("app_users")
    .select("id")
    .eq("id", targetUserId)
    .eq("church_id", churchId)
    .maybeSingle();

  if (!target) throw new Error("User is not in your church");
}

async function validateBranch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  branchId: string | null,
  churchId: string
) {
  if (!branchId) return;

  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("church_id", churchId)
    .eq("active", true)
    .maybeSingle();

  if (!branch) throw new Error("Selected branch is not available");
}

async function upsertRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    user_id: string;
    role: ManagedUserRoleValues["role"];
    branch_id: string | null;
    finance_permission: boolean;
    finance_history_permission: boolean;
  }
) {
  // src/types/database.ts is generated from Supabase and will be regenerated
  // after this schema change is merged. The casts below only bridge that stale
  // generated snapshot; PostgreSQL already knows about `super_admin`.
  let existingQuery = supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", input.user_id)
    .eq("role", input.role as never);

  existingQuery = input.branch_id
    ? existingQuery.eq("branch_id", input.branch_id)
    : existingQuery.is("branch_id", null);

  const { data: existing } = await existingQuery.maybeSingle();

  const { error } = existing
    ? await supabase
        .from("user_roles")
        .update({
          finance_permission: input.finance_permission,
          finance_history_permission: input.finance_history_permission,
        })
        .eq("id", existing.id)
    : await supabase.from("user_roles").insert(input as never);

  if (error) throw error;
}

/**
 * Assign a role to an existing user in the same church.
 *
 * Super Admin is special: only another Super Admin may grant it, it is always
 * church-wide with full finance access, and we maintain a companion
 * Administrator role so older server-side admin checks continue to work while
 * Super Admin remains a strict superset of Administrator.
 */
export async function assignManagedUserRole(input: ManagedUserRoleValues) {
  const { supabase, churchId, isSuperAdmin } = await getAccessActor();
  await assertTargetInChurch(supabase, input.user_id, churchId);

  if (input.role === "super_admin") {
    if (!isSuperAdmin) throw new Error("Only a Super Admin can assign Super Admin access");

    await upsertRole(supabase, {
      user_id: input.user_id,
      role: "administrator",
      branch_id: null,
      finance_permission: false,
      finance_history_permission: false,
    });

    await upsertRole(supabase, {
      user_id: input.user_id,
      role: "super_admin",
      branch_id: null,
      finance_permission: true,
      finance_history_permission: true,
    });

    revalidatePath("/admin/users");
    return;
  }

  const branchId = input.role === "administrator" ? null : input.branch_id ?? null;
  await validateBranch(supabase, branchId, churchId);

  await upsertRole(supabase, {
    user_id: input.user_id,
    role: input.role,
    branch_id: branchId,
    finance_permission: input.finance_permission,
    finance_history_permission: input.finance_permission
      ? input.finance_history_permission
      : false,
  });

  revalidatePath("/admin/users");
}

export async function removeManagedUserRole(roleAssignmentId: string) {
  const { supabase, churchId, isSuperAdmin } = await getAccessActor();

  const { data: assignment } = await supabase
    .from("user_roles")
    .select("id, user_id, role")
    .eq("id", roleAssignmentId)
    .maybeSingle();

  if (!assignment) throw new Error("Role assignment not found");
  await assertTargetInChurch(supabase, assignment.user_id, churchId);

  const assignmentRole = assignment.role as string;
  if (assignmentRole === "super_admin" && !isSuperAdmin) {
    throw new Error("Only a Super Admin can remove Super Admin access");
  }

  if (assignmentRole === "administrator") {
    const { data: superAdminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", assignment.user_id)
      .eq("role", "super_admin" as never)
      .maybeSingle();

    if (superAdminRole) {
      throw new Error("Administrator access is included with Super Admin and cannot be removed separately");
    }
  }

  const { error } = await supabase.from("user_roles").delete().eq("id", roleAssignmentId);
  if (error) throw error;

  revalidatePath("/admin/users");
}

/** Uses a SECURITY DEFINER RPC that still evaluates the signed-in actor, so
 * ordinary Administrators cannot deactivate a Super Admin. */
export async function setManagedUserActive(userId: string, active: boolean) {
  const { supabase } = await getAccessActor();
  const { error } = await supabase.rpc(
    "set_church_user_active" as never,
    { p_user_id: userId, p_active: active } as never
  );

  if (error) throw error;
  revalidatePath("/admin/users");
}
