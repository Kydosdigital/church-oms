import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { getPlatformAdminContext } from "@/lib/data/platform";
import { AppShell } from "@/components/layout/app-shell";
import {
  canAccessAdmin,
  canAccessLiveCounter,
  canAccessProgrammes,
  canAccessReports,
  canAccessRevenue,
} from "@/lib/access-policy";

// Everything under this route group requires a signed-in session and has no
// search-relevant content of its own (dashboards, data-entry forms, admin
// screens) — keep it out of search results even though robots.ts already
// disallows crawling it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, platformAdmin] = await Promise.all([
    getCurrentUserContext(),
    getPlatformAdminContext(),
  ]);

  // Proxy already guards unauthenticated access (src/lib/supabase/middleware.ts),
  // but a signed-in auth user with no app_users/church row yet (pending admin
  // setup) still needs to land somewhere sane rather than crash the layout.
  if (!ctx) {
    redirect("/login?awaiting_setup=1");
  }

  // Database authorization helpers already treat active=false as immediate loss
  // of tenant/role authority. Mirror that at the app-shell boundary so a
  // deactivated person does not see navigation or confusing empty screens while
  // their Supabase Auth session is still valid.
  if (!ctx.user.active) {
    redirect("/account-inactive");
  }

  // A freshly signed-up user has an app_users row (via the on_auth_user_created
  // trigger) but no church yet — send them to set one up before anything else
  // in the app (which assumes a church_id everywhere) can render sensibly.
  if (!ctx.user.church_id) {
    redirect("/onboarding");
  }

  const isAdministrator = canAccessAdmin(ctx);

  // AppShell is a Client Component. Only pass plain serializable data across
  // the Server -> Client boundary, never the PermissionContext class instance.
  // The same access-policy functions also guard direct route access, so the
  // navigation and server routes cannot drift apart.
  const shellContext = {
    user: { full_name: ctx.user.full_name },
    canViewFinance: canAccessRevenue(ctx),
    canViewProgrammes: canAccessProgrammes(ctx),
    canViewReports: canAccessReports(ctx),
    canUseLiveCounter: canAccessLiveCounter(ctx),
    isAdministrator,
    isPlatformAdmin: Boolean(platformAdmin),
  };

  return <AppShell ctx={shellContext}>{children}</AppShell>;
}
