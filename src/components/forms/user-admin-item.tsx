"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeManagedUserRole, setManagedUserActive } from "@/lib/data/user-access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRoleForm } from "@/components/forms/user-role-form";
import { ATTENDANCE_ROLE_LABELS } from "@/types/domain";
import type { Branch } from "@/types/domain";
import type { AdminUserRow } from "@/lib/data/admin";

export function UserAdminItem({
  user,
  branches,
  canAssignSuperAdmin,
}: {
  user: AdminUserRow;
  branches: Branch[];
  canAssignSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userIsSuperAdmin = (user.user_roles ?? []).some((role) => role.role === "super_admin");

  // Super Admin carries a companion Administrator row for compatibility with
  // older server checks. Hide that implementation detail from the admin UI.
  const visibleRoles = (user.user_roles ?? []).filter(
    (role) => !(userIsSuperAdmin && role.role === "administrator" && role.branch_id === null)
  );

  async function handleRemoveRole(roleId: string) {
    setPending(roleId);
    setError(null);
    try {
      await removeManagedUserRole(roleId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove role");
    } finally {
      setPending(null);
    }
  }

  async function toggleActive() {
    setPending("active");
    setError(null);
    try {
      await setManagedUserActive(user.id, !user.active);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update user");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{user.full_name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {!user.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
          {(!userIsSuperAdmin || canAssignSuperAdmin) && (
            <Button size="sm" variant="ghost" onClick={toggleActive} disabled={pending === "active"}>
              {user.active ? "Deactivate" : "Reactivate"}
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {visibleRoles.map((r) => {
          const canRemove = r.role !== "super_admin" || canAssignSuperAdmin;
          return (
            <Badge key={r.id} className="gap-1.5">
              {ATTENDANCE_ROLE_LABELS[r.role] ?? r.role}
              {r.branches?.name ? ` · ${r.branches.name}` : " · all branches"}
              {r.role === "super_admin"
                ? " · full access"
                : r.finance_permission
                  ? r.finance_history_permission
                    ? " · finance"
                    : " · finance (current only)"
                  : ""}
              {canRemove && (
                <button
                  type="button"
                  aria-label={`Remove ${ATTENDANCE_ROLE_LABELS[r.role]} role`}
                  onClick={() => handleRemoveRole(r.id)}
                  disabled={pending === r.id}
                  className="ml-1 hover:opacity-70"
                >
                  ×
                </button>
              )}
            </Badge>
          );
        })}
        {visibleRoles.length === 0 && <span className="text-sm text-muted">No roles assigned yet</span>}
      </div>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <UserRoleForm
        userId={user.id}
        branches={branches}
        canAssignSuperAdmin={canAssignSuperAdmin}
      />
    </div>
  );
}
