import "server-only";

import { redirect } from "next/navigation";
import {
  getCurrentUserContext,
  type CurrentUserContext,
} from "@/lib/data/current-user";
import {
  canAccessAdmin,
  canAccessProgrammes,
  canAccessRevenue,
  canAccessReports,
} from "@/lib/access-policy";

export {
  canAccessAdmin,
  canAccessProgrammes,
  canAccessRevenue,
  canAccessReports,
};

export type AppAccessArea = "admin" | "programmes" | "revenue" | "reports";

async function requireActiveChurchUser() {
  const ctx = await getCurrentUserContext();

  if (!ctx) {
    redirect("/login");
  }

  if (!ctx.user.active) {
    redirect("/account-inactive");
  }

  if (!ctx.user.church_id) {
    redirect("/onboarding");
  }

  return ctx;
}

async function requireArea(
  area: AppAccessArea,
  allowed: (ctx: CurrentUserContext) => boolean
) {
  const ctx = await requireActiveChurchUser();

  if (!allowed(ctx)) {
    redirect("/dashboard?access=" + area);
  }

  return ctx;
}

export function requireAdminAccess() {
  return requireArea("admin", canAccessAdmin);
}

export function requireProgrammesAccess() {
  return requireArea("programmes", canAccessProgrammes);
}

export function requireRevenueAccess() {
  return requireArea("revenue", canAccessRevenue);
}

export function requireReportsAccess() {
  return requireArea("reports", canAccessReports);
}
