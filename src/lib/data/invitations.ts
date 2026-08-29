"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InviteUserWithRoleValues } from "@/lib/validations/admin";

async function requireAdministrator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roleNames = (roles ?? []).map((row) => row.role as string);
  const isSuperAdmin = roleNames.includes("super_admin");
  const isAdministrator = isSuperAdmin || roleNames.includes("administrator");

  if (!isAdministrator) {
    throw new Error("Only administrators can invite users");
  }

  const { data: profile } = await supabase
    .from("app_users")
    .select("church_id")
    .eq("id", user.id)
    .single();

  if (!profile?.church_id) {
    throw new Error("Administrator is not assigned to a church");
  }

  return { supabase, churchId: profile.church_id, isSuperAdmin };
}

/**
 * Invite a staff member or volunteer into the administrator's existing church
 * and create their first role before they ever sign in.
 *
 * Public signup remains a separate path for prospective church owners who are
 * creating a brand-new Church OMS organisation.
 */
export async function inviteUserWithRole(input: InviteUserWithRoleValues) {
  const { supabase, churchId, isSuperAdmin } = await requireAdministrator();
  const isInvitingSuperAdmin = input.role === "super_admin";
  const isChurchwideRole =
    isInvitingSuperAdmin || input.role === "administrator";

  if (isInvitingSuperAdmin && !isSuperAdmin) {
    throw new Error("Only a Super Admin can invite another Super Admin");
  }

  const branchId = isChurchwideRole ? null : input.branch_id ?? null;

  // Never trust a branch id supplied by the browser. If one was selected, it
  // must be an active branch belonging to the administrator's own church.
  if (branchId) {
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("church_id", churchId)
      .eq("active", true)
      .maybeSingle();

    if (!branch) throw new Error("Selected branch is not available");
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.full_name },
  });

  if (inviteError) throw inviteError;
  if (!invited.user) throw new Error("Supabase did not return the invited user");

  try {
    const { error: profileError } = await admin
      .from("app_users")
      .update({
        full_name: input.full_name,
        church_id: churchId,
        active: true,
      })
      .eq("id", invited.user.id);

    if (profileError) throw profileError;

    if (isInvitingSuperAdmin) {
      // Super Admin is always church-wide with full finance access. Keep an
      // Administrator companion role for older server-side admin checks.
      const { error: adminRoleError } = await supabase.from("user_roles").insert({
        user_id: invited.user.id,
        role: "administrator",
        branch_id: null,
        finance_permission: false,
        finance_history_permission: false,
      });
      if (adminRoleError) throw adminRoleError;

      // `src/types/database.ts` is generated and may briefly lag a newly
      // applied enum migration. PostgreSQL already validates this value.
      const { error: superRoleError } = await supabase.from("user_roles").insert({
        user_id: invited.user.id,
        role: "super_admin" as never,
        branch_id: null,
        finance_permission: true,
        finance_history_permission: true,
      });
      if (superRoleError) throw superRoleError;
    } else {
      // Use the signed-in administrator client for role creation so the normal
      // RLS policy still participates in authorization. This cast only bridges
      // the generated DB type until it is regenerated from the updated schema.
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: invited.user.id,
        role: input.role as never,
        branch_id: branchId,
        finance_permission: input.finance_permission,
        finance_history_permission: input.finance_permission
          ? input.finance_history_permission
          : false,
      });

      if (roleError) throw roleError;
    }
  } catch (error) {
    // Avoid leaving behind a half-configured invited account if assigning its
    // church or role fails. The administrator can simply retry the invite.
    await admin.auth.admin.deleteUser(invited.user.id);
    throw error;
  }

  revalidatePath("/admin/users");
}
