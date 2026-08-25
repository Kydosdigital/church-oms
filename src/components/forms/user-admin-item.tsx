"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeUserRole, setUserActive } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRoleForm } from "@/components/forms/user-role-form";
import { ATTENDANCE_ROLE_LABELS } from "@/types/domain";
import type { Branch } from "@/types/domain";
import type { AdminUserRow } from "@/lib/data/admin";

export function UserAdminItem({ user, branches }: { user: AdminUserRow; branches: Branch[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function handleRemoveRole(roleId: string) {
    setPending(roleId);
    try {
      await removeUserRole(roleId);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function toggleActive() {
    setPending("active");
    try {
      await setUserActive(user.id, !user.active);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{user.full_name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {!user.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
          <Button size="sm" variant="ghost" onClick={toggleActive} disabled={pending === "active"}>
            {user.active ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {(user.user_roles ?? []).map((r) => (
          <Badge key={r.id} className="gap-1.5">
            {ATTENDANCE_ROLE_LABELS[r.role] ?? r.role}
            {r.branches?.name ? ` · ${r.branches.name}` : " · all branches"}
            {r.finance_permission ? " · finance" : ""}
            <button
              type="button"
              aria-label={`Remove ${ATTENDANCE_ROLE_LABELS[r.role]} role`}
              onClick={() => handleRemoveRole(r.id)}
              disabled={pending === r.id}
              className="ml-1 hover:opacity-70"
            >
              ×
            </button>
          </Badge>
        ))}
        {(user.user_roles ?? []).length === 0 && <span className="text-sm text-muted">No roles assigned yet</span>}
      </div>
      <UserRoleForm userId={user.id} branches={branches} />
    </div>
  );
}
