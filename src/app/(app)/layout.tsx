import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { AppShell } from "@/components/layout/app-shell";

// Everything under this route group requires a signed-in session and has no
// search-relevant content of its own (dashboards, data-entry forms, admin
// screens) — keep it out of search results even though robots.ts already
// disallows crawling it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  const hasRole = (...roles: string[]) => ctx.roles.some((assignment) => roles.includes(assignment.role));
  const isAdministrator = ctx.permissions.isAdministrator();

  // AppShell is a Client Component. Only pass plain serializable data across
  // the Server -> Client boundary, never the PermissionContext class instance.
  const shellContext = {
    user: { full_name: ctx.user.full_name },
    canViewFinance: ctx.permissions.hasFinancePermission(),
    canViewProgrammes:
      isAdministrator || hasRole("usher", "attendance_verifier", "pastor"),
    canViewReports:
      isAdministrator ||
      hasRole("pastor", "attendance_verifier") ||
      ctx.permissions.hasFinanceHistoryPermission(),
    isAdministrator,
  };

  return <AppShell ctx={shellContext}>{children}</AppShell>;
}
