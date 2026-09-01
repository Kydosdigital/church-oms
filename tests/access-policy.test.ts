import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessLiveCounter,
  canAccessProgrammes,
  canAccessReports,
  canAccessRevenue,
} from "@/lib/access-policy";
import { PermissionContext } from "@/lib/permissions";
import type {
  AppRole,
  AppUser,
  UserRoleAssignment,
} from "@/types/domain";
import type { CurrentUserContext } from "@/lib/data/current-user";

let roleSequence = 0;

function role(
  appRole: AppRole,
  options: {
    finance?: boolean;
    history?: boolean;
    branchId?: string | null;
  } = {}
): UserRoleAssignment {
  roleSequence += 1;
  return {
    id: "role-" + roleSequence,
    user_id: "00000000-0000-4000-8000-000000000001",
    role: appRole,
    branch_id: options.branchId ?? null,
    finance_permission: options.finance ?? false,
    finance_history_permission: options.history ?? false,
  };
}

function context(assignments: UserRoleAssignment[]): CurrentUserContext {
  const user: AppUser = {
    id: "00000000-0000-4000-8000-000000000001",
    church_id: "00000000-0000-4000-8000-000000000002",
    full_name: "Test User",
    email: "test@example.com",
    active: true,
  };

  return {
    user,
    roles: assignments,
    permissions: new PermissionContext(assignments),
  };
}

describe("shared app access policy", () => {
  it("gives an Usher programmes and live counter, but not Admin/Revenue/Reports", () => {
    const ctx = context([role("usher")]);

    expect(canAccessProgrammes(ctx)).toBe(true);
    expect(canAccessLiveCounter(ctx)).toBe(true);
    expect(canAccessAdmin(ctx)).toBe(false);
    expect(canAccessRevenue(ctx)).toBe(false);
    expect(canAccessReports(ctx)).toBe(false);
  });

  it("gives an Attendance Verifier programmes, reports and live counter", () => {
    const ctx = context([role("attendance_verifier")]);

    expect(canAccessProgrammes(ctx)).toBe(true);
    expect(canAccessReports(ctx)).toBe(true);
    expect(canAccessLiveCounter(ctx)).toBe(true);
    expect(canAccessRevenue(ctx)).toBe(false);
  });

  it("gives a Pastor programmes, reports and live counter", () => {
    const ctx = context([role("pastor")]);

    expect(canAccessProgrammes(ctx)).toBe(true);
    expect(canAccessReports(ctx)).toBe(true);
    expect(canAccessLiveCounter(ctx)).toBe(true);
    expect(canAccessAdmin(ctx)).toBe(false);
  });

  it("keeps finance entry separate from finance history", () => {
    const currentFinance = context([
      role("treasurer", { finance: true, history: false }),
    ]);
    const historicalFinance = context([
      role("treasurer", { finance: true, history: true }),
    ]);

    expect(canAccessRevenue(currentFinance)).toBe(true);
    expect(canAccessReports(currentFinance)).toBe(false);

    expect(canAccessRevenue(historicalFinance)).toBe(true);
    expect(canAccessReports(historicalFinance)).toBe(true);
  });

  it("keeps Finance Verifier access scoped to finance permissions and history", () => {
    const currentFinanceVerifier = context([
      role("finance_verifier", { finance: true, history: false }),
    ]);
    const historicalFinanceVerifier = context([
      role("finance_verifier", { finance: true, history: true }),
    ]);

    expect(canAccessRevenue(currentFinanceVerifier)).toBe(true);
    expect(canAccessReports(currentFinanceVerifier)).toBe(false);
    expect(canAccessProgrammes(currentFinanceVerifier)).toBe(false);
    expect(canAccessLiveCounter(currentFinanceVerifier)).toBe(false);

    expect(canAccessRevenue(historicalFinanceVerifier)).toBe(true);
    expect(canAccessReports(historicalFinanceVerifier)).toBe(true);
  });

  it("does not grant ordinary Administrator finance unless explicitly configured", () => {
    const admin = context([role("administrator")]);
    const financeAdmin = context([
      role("administrator", { finance: true, history: true }),
    ]);

    expect(canAccessAdmin(admin)).toBe(true);
    expect(canAccessProgrammes(admin)).toBe(true);
    expect(canAccessReports(admin)).toBe(true);
    expect(canAccessRevenue(admin)).toBe(false);

    expect(canAccessRevenue(financeAdmin)).toBe(true);
  });

  it("keeps Super Admin as full church-wide access", () => {
    const ctx = context([
      role("administrator"),
      role("super_admin", { finance: true, history: true }),
    ]);

    expect(canAccessAdmin(ctx)).toBe(true);
    expect(canAccessProgrammes(ctx)).toBe(true);
    expect(canAccessRevenue(ctx)).toBe(true);
    expect(canAccessReports(ctx)).toBe(true);
    expect(canAccessLiveCounter(ctx)).toBe(true);
  });
});
