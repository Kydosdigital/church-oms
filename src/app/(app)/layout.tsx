import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentUserContext();

  // Proxy already guards unauthenticated access (src/lib/supabase/middleware.ts),
  // but a signed-in auth user with no app_users/church row yet (pending admin
  // setup) still needs to land somewhere sane rather than crash the layout.
  if (!ctx) {
    redirect("/login?awaiting_setup=1");
  }

  // A freshly signed-up user has an app_users row (via the on_auth_user_created
  // trigger) but no church yet — send them to set one up before anything else
  // in the app (which assumes a church_id everywhere) can render sensibly.
  if (!ctx.user.church_id) {
    redirect("/onboarding");
  }

  return <AppShell ctx={ctx}>{children}</AppShell>;
}
