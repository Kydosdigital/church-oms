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

  // One server-only database transaction now owns the entire first-run setup:
  // church defaults, owner attachment, Administrator role and Super Admin role.
  // If any one of those steps fails, PostgreSQL rolls the whole onboarding back
  // so the user cannot be stranded in a half-created church.
  const { data: churchId, error: onboardingError } = await admin.rpc(
    "complete_church_onboarding",
    {
      p_user_id: user.id,
      p_name: parsed.data.name,
      p_currency: parsed.data.currency,
      p_timezone: parsed.data.timezone,
    }
  );

  if (onboardingError || !churchId) {
    return {
      error:
        onboardingError?.message ??
        "Could not set up the church. Nothing was partially created, so you can safely try again.",
    };
  }

  redirect("/dashboard");
}
