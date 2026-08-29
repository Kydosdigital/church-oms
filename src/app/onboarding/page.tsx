import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import { getSupportedTimeZones } from "@/lib/timezones";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", user.id).single();
  if (profile?.church_id) redirect("/dashboard");

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center px-4 py-12 outline-none">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Set up your church</h1>
          <p className="text-sm text-muted mt-1">
            You&rsquo;re signed in but not attached to a church yet. This creates your church record
            with a main branch, default service types and offering categories, and makes you its
            first administrator.
          </p>
        </div>
        <OnboardingForm timeZones={getSupportedTimeZones()} />
      </div>
    </main>
  );
}
