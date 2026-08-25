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

  isAdministrator(): boolean {
    return this.hasRole("administrator");
  }

  /** Finance visibility is explicit and independent of role (section 2.1) —
   *  an administrator does NOT automatically see finance data. */
  hasFinancePermission(branchId?: string): boolean {
    return this.roles.some(
      (r) => r.finance_permission && (r.branch_id === null || !branchId || r.branch_id === branchId)
    );
  }

  /** A second, independent flag on top of hasFinancePermission: whether this
   * user can see OTHER services' amounts — dashboards, trends, exports — not
   * just enter/review their own current/returned entry. Defaults to true for
   * every existing finance-permitted user; an administrator can restrict a
   * specific person from the Users & roles screen. */
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
   * for global usher access or an administrator (who may need to create on
   * behalf of any branch). Used to lock the branch field on the programme
   * entry form to the user's own branch(es), rather than a freely editable
   * dropdown of every branch in the church — reduces accidental cross-branch
   * submissions (server-side RLS already rejects them; this just avoids the
   * confusing failure). */
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

  canViewDashboards(): boolean {
    return this.hasRole("pastor") || this.isAdministrator();
  }
}
