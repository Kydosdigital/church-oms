"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionChurchSchema } from "@/lib/validations/admin";

export interface OnboardingActionState {
  error?: string;
}

/**
 * First-run onboarding: a signed-in auth user with no church yet (app_users
 * row exists via the handle_new_auth_user trigger, but church_id is null)
 * provisions their own church and becomes its first Super Admin.
 *
 * Public church registration is intentionally still available during the
 * current testing phase. Stronger organisation-verification checks can be
 * added later without changing the staff invitation model.
 */
export async function provisionChurch(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", user.id).single();
  if (profile?.church_id) {
    redirect("/dashboard");
  }

  const parsed = provisionChurchSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const admin = createAdminClient();

  const { data: churchId, error: provisionError } = await admin.rpc("provision_new_church", {
    p_name: parsed.data.name,
    p_currency: parsed.data.currency,
    p_timezone: parsed.data.timezone,
  });
  if (provisionError || !churchId) {
    return { error: provisionError?.message ?? "Could not set up the church. Try again." };
  }

  const { error: userError } = await admin
    .from("app_users")
    .update({ church_id: churchId })
    .eq("id", user.id);
  if (userError) {
    return { error: userError.message };
  }

  // Super Admin is the highest authority inside this church. It is always
  // church-wide and carries full finance visibility. We also keep the normal
  // Administrator companion role so existing admin server checks continue to
  // work while Super Admin remains a strict superset.
  const { error: adminRoleError } = await admin.from("user_roles").insert({
    user_id: user.id,
    role: "administrator",
    branch_id: null,
    finance_permission: false,
    finance_history_permission: false,
  });
  if (adminRoleError) {
    return { error: adminRoleError.message };
  }

  // `src/types/database.ts` is generated and may briefly lag a newly applied
  // enum migration. PostgreSQL already validates this value at runtime.
  const { error: superAdminRoleError } = await admin.from("user_roles").insert({
    user_id: user.id,
    role: "super_admin" as never,
    branch_id: null,
    finance_permission: true,
    finance_history_permission: true,
  });
  if (superAdminRoleError) {
    return { error: superAdminRoleError.message };
  }

  redirect("/dashboard");
}
