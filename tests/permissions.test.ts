import { describe, it, expect } from "vitest";
import { PermissionContext } from "@/lib/permissions";
import type { UserRoleAssignment } from "@/types/domain";

function role(overrides: Partial<UserRoleAssignment> = {}): UserRoleAssignment {
  return {
    id: "role-1",
    user_id: "user-1",
    role: "usher",
    branch_id: "branch-1",
    finance_permission: false,
    finance_history_permission: true,
    ...overrides,
  };
}

describe("PermissionContext.isAdministrator", () => {
  it("is true only with an administrator role assignment", () => {
    expect(new PermissionContext([role({ role: "administrator", branch_id: null })]).isAdministrator()).toBe(true);
    expect(new PermissionContext([role({ role: "usher" })]).isAdministrator()).toBe(false);
  });
});

describe("PermissionContext.hasFinancePermission", () => {
  it("is independent of role — a treasurer without the flag has no finance access", () => {
    const ctx = new PermissionContext([role({ role: "treasurer", finance_permission: false })]);
    expect(ctx.hasFinancePermission()).toBe(false);
  });
  it("is true when the flag is set", () => {
    const ctx = new PermissionContext([role({ role: "treasurer", finance_permission: true })]);
    expect(ctx.hasFinancePermission()).toBe(true);
  });
  it("an administrator does not automatically get finance access (section 2.1)", () => {
    const ctx = new PermissionContext([role({ role: "administrator", branch_id: null, finance_permission: false })]);
    expect(ctx.hasFinancePermission()).toBe(false);
  });
  it("is scoped to a branch when branchId is passed", () => {
    const ctx = new PermissionContext([role({ role: "treasurer", branch_id: "branch-1", finance_permission: true })]);
    expect(ctx.hasFinancePermission("branch-1")).toBe(true);
    expect(ctx.hasFinancePermission("branch-2")).toBe(false);
  });
  it("branch_id null means all branches", () => {
    const ctx = new PermissionContext([role({ role: "treasurer", branch_id: null, finance_permission: true })]);
    expect(ctx.hasFinancePermission("any-branch")).toBe(true);
  });
});

describe("PermissionContext.hasFinanceHistoryPermission", () => {
  it("requires finance_permission AND finance_history_permission both true", () => {
    const noFinance = new PermissionContext([
      role({ role: "treasurer", finance_permission: false, finance_history_permission: true }),
    ]);
    expect(noFinance.hasFinanceHistoryPermission()).toBe(false);

    const restricted = new PermissionContext([
      role({ role: "treasurer", finance_permission: true, finance_history_permission: false }),
    ]);
    expect(restricted.hasFinanceHistoryPermission()).toBe(false);

    const full = new PermissionContext([
      role({ role: "treasurer", finance_permission: true, finance_history_permission: true }),
    ]);
    expect(full.hasFinanceHistoryPermission()).toBe(true);
  });
});

describe("PermissionContext.usherBranchScope", () => {
  it("returns 'all' for administrators", () => {
    const ctx = new PermissionContext([role({ role: "administrator", branch_id: null })]);
    expect(ctx.usherBranchScope()).toBe("all");
  });
  it("returns 'all' for a church-wide usher assignment (branch_id null)", () => {
    const ctx = new PermissionContext([role({ role: "usher", branch_id: null })]);
    expect(ctx.usherBranchScope()).toBe("all");
  });
  it("returns only the assigned branch ids for a scoped usher", () => {
    const ctx = new PermissionContext([
      role({ role: "usher", branch_id: "branch-1" }),
      role({ role: "usher", branch_id: "branch-2" }),
      role({ role: "treasurer", branch_id: "branch-3" }),
    ]);
    expect(ctx.usherBranchScope()).toEqual(["branch-1", "branch-2"]);
  });
  it("returns an empty list for a user with no usher role", () => {
    const ctx = new PermissionContext([role({ role: "treasurer", branch_id: "branch-1" })]);
    expect(ctx.usherBranchScope()).toEqual([]);
  });
});

describe("PermissionContext.canVerifyAttendance / canVerifyFinance", () => {
  it("requires the matching verifier role for that branch", () => {
    const ctx = new PermissionContext([role({ role: "attendance_verifier", branch_id: "branch-1" })]);
    expect(ctx.canVerifyAttendance("branch-1")).toBe(true);
    expect(ctx.canVerifyAttendance("branch-2")).toBe(false);
  });
  it("finance verification also requires finance_permission", () => {
    const ctx = new PermissionContext([
      role({ role: "finance_verifier", branch_id: "branch-1", finance_permission: false }),
    ]);
    expect(ctx.canVerifyFinance("branch-1")).toBe(false);
  });
});
