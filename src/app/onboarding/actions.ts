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
 * provisions their own church and becomes its first administrator.
 *
 * provision_new_church() has EXECUTE revoked from anon/authenticated
 * (supabase/migrations/0005-0006) — it's a platform/onboarding operation,
 * not something any signed-in user should be able to call for an arbitrary
 * church. This action calls it via the service-role client instead, only
 * after confirming (with the RLS-bound client) that the caller is signed in
 * and genuinely has no church yet — so it can't be used to re-provision or
 * hijack an existing tenant.
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
    // Already provisioned (e.g. re-submitted this form) — nothing to do.
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

  // The first administrator gets full finance visibility by default —
  // there's no one else to grant it to them yet, and they can adjust their
  // own or anyone else's from Users & roles afterwards.
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: user.id,
    role: "administrator",
    branch_id: null,
    finance_permission: true,
    finance_history_permission: true,
  });
  if (roleError) {
    return { error: roleError.message };
  }

  redirect("/dashboard");
}
