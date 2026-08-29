import "server-only";

import { redirect } from "next/navigation";
import {
  getCurrentUserContext,
  type CurrentUserContext,
} from "@/lib/data/current-user";

export type AppAccessArea = "admin" | "programmes" | "revenue" | "reports";

function hasAnyRole(ctx: CurrentUserContext, roles: string[]) {
  return ctx.roles.some((assignment) => roles.includes(assignment.role));
}

export function canAccessAdmin(ctx: CurrentUserContext) {
  return ctx.permissions.isAdministrator();
}

export function canAccessProgrammes(ctx: CurrentUserContext) {
  return (
    ctx.permissions.isAdministrator() ||
    hasAnyRole(ctx, ["usher", "attendance_verifier", "pastor"])
  );
}

export function canAccessRevenue(ctx: CurrentUserContext) {
  return ctx.permissions.hasFinancePermission();
}

export function canAccessReports(ctx: CurrentUserContext) {
  return (
    ctx.permissions.isAdministrator() ||
    hasAnyRole(ctx, ["pastor", "attendance_verifier"]) ||
    ctx.permissions.hasFinanceHistoryPermission()
  );
}

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
