import type { CurrentUserContext } from "@/lib/data/current-user";

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

export function canAccessLiveCounter(ctx: CurrentUserContext) {
  return (
    ctx.permissions.isAdministrator() ||
    hasAnyRole(ctx, ["usher", "attendance_verifier", "pastor"])
  );
}
