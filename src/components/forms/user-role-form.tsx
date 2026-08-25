"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { userRoleSchema, appRoleValues, type UserRoleValues } from "@/lib/validations/admin";
import { assignManagedUserRole } from "@/lib/data/user-access";
import { Button } from "@/components/ui/button";
import { Label, FieldError } from "@/components/ui/input";
import { ATTENDANCE_ROLE_LABELS } from "@/types/domain";
import type { Branch } from "@/types/domain";

export function UserRoleForm({
  userId,
  branches,
  canAssignSuperAdmin,
}: {
  userId: string;
  branches: Branch[];
  canAssignSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserRoleValues>({
    resolver: zodResolver(userRoleSchema) as never,
    defaultValues: { user_id: userId, role: "usher", finance_permission: false, finance_history_permission: true },
  });

  const role = watch("role");
  const financePermission = watch("finance_permission");
  const isSuperAdminRole = role === "super_admin";
  const assignableRoles = appRoleValues.filter(
    (value) => canAssignSuperAdmin || value !== "super_admin"
  );

  useEffect(() => {
    if (isSuperAdminRole) {
      setValue("branch_id", undefined);
      setValue("finance_permission", true);
      setValue("finance_history_permission", true);
    }
  }, [isSuperAdminRole, setValue]);

  async function onSubmit(data: UserRoleValues) {
    setPending(true);
    setError(null);
    try {
      await assignManagedUserRole({
        ...data,
        branch_id: isSuperAdminRole ? undefined : data.branch_id || undefined,
        finance_permission: isSuperAdminRole ? true : data.finance_permission,
        finance_history_permission: isSuperAdminRole ? true : data.finance_history_permission,
      });
      reset({
        user_id: userId,
        role: "usher",
        branch_id: undefined,
        finance_permission: false,
        finance_history_permission: true,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not assign role");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-2 pt-2">
      <input type="hidden" {...register("user_id")} />
      <div>
        <Label htmlFor={`role-${userId}`}>Role</Label>
        <select
          id={`role-${userId}`}
          {...register("role")}
          className="block rounded-brand border border-surface-border bg-background h-9 px-2 text-sm"
        >
          {assignableRoles.map((r) => (
            <option key={r} value={r}>
              {ATTENDANCE_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`branch-${userId}`}>Branch</Label>
        <select
          id={`branch-${userId}`}
          {...register("branch_id")}
          disabled={isSuperAdminRole}
          className="block rounded-brand border border-surface-border bg-background h-9 px-2 text-sm disabled:opacity-60"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {isSuperAdminRole ? (
        <span className="text-xs text-brand h-9 flex items-center">Full church + finance access</span>
      ) : (
        <>
          <label className="flex items-center gap-1.5 text-sm h-9">
            <input type="checkbox" className="h-4 w-4" {...register("finance_permission")} />
            Finance access
          </label>
          {financePermission && (
            <label
              className="flex items-center gap-1.5 text-sm h-9"
              title="Without this, they can only enter/review the current service's offering, not past amounts, dashboards or exports."
            >
              <input type="checkbox" className="h-4 w-4" {...register("finance_history_permission")} />
              View past financial records
            </label>
          )}
        </>
      )}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Assigning…" : "Assign role"}
      </Button>
      {error && <p className="text-sm text-danger w-full">{error}</p>}
      <FieldError>{errors.role?.message}</FieldError>
    </form>
  );
}
