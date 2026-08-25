import type { AppRole, UserRoleAssignment } from "@/types/domain";

/**
 * Client-side permission helpers. These only control what the UI *shows* —
 * the real enforcement lives in Postgres RLS policies and the SECURITY
 * DEFINER RPCs (supabase/migrations/0002 and 0003). Never rely on this file
 * alone for anything sensitive.
 */
export class PermissionContext {
  constructor(private roles: UserRoleAssignment[]) {}

  hasRole(role: AppRole, branchId?: string): boolean {
    return this.roles.some(
      (r) => r.role === role && (r.branch_id === null || !branchId || r.branch_id === branchId)
    );
  }

  isSuperAdmin(): boolean {
    return this.hasRole("super_admin");
  }

  /** Super Admin inherits all Administrator capabilities within the church. */
  isAdministrator(): boolean {
    return this.isSuperAdmin() || this.hasRole("administrator");
  }

  /** Finance visibility remains explicit for ordinary roles. Super Admin rows
   * are database-constrained to full finance visibility. */
  hasFinancePermission(branchId?: string): boolean {
    return this.roles.some(
      (r) => r.finance_permission && (r.branch_id === null || !branchId || r.branch_id === branchId)
    );
  }

  /** A second, independent flag on top of hasFinancePermission: whether this
   * user can see OTHER services' amounts — dashboards, trends, exports — not
   * just enter/review their own current/returned entry. */
  hasFinanceHistoryPermission(branchId?: string): boolean {
    return this.roles.some(
      (r) =>
        r.finance_permission &&
        r.finance_history_permission &&
        (r.branch_id === null || !branchId || r.branch_id === branchId)
    );
  }

  branchIdsForRole(role: AppRole): (string | null)[] {
    return this.roles.filter((r) => r.role === role).map((r) => r.branch_id);
  }

  /** All branches this user has any assignment for; null means "all branches". */
  hasAllBranchAccess(): boolean {
    return this.roles.some((r) => r.branch_id === null);
  }

  canCreateProgramme(branchId: string): boolean {
    return this.hasRole("usher", branchId);
  }

  /** Branch ids this user can create programmes for (usher role), or "all"
   * for global usher access or an administrator/super admin acting on behalf
   * of a branch. */
  usherBranchScope(): "all" | string[] {
    if (this.isAdministrator()) return "all";
    if (this.roles.some((r) => r.role === "usher" && r.branch_id === null)) return "all";
    return this.roles.filter((r) => r.role === "usher").map((r) => r.branch_id as string);
  }

  canVerifyAttendance(branchId: string): boolean {
    return this.hasRole("attendance_verifier", branchId);
  }

  canEnterFinance(branchId: string): boolean {
    return this.hasFinancePermission(branchId) && (this.hasRole("treasurer", branchId) || this.isAdministrator());
  }

  canVerifyFinance(branchId: string): boolean {
    return this.hasFinancePermission(branchId) && this.hasRole("finance_verifier", branchId);
  }

  canManageAdmin(): boolean {
    return this.isAdministrator();
  }

  canAssignSuperAdmin(): boolean {
    return this.isSuperAdmin();
  }

  canViewDashboards(): boolean {
    return this.hasRole("pastor") || this.isAdministrator();
  }
}
