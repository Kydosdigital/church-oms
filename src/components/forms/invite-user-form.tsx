"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  appRoleValues,
  inviteUserWithRoleSchema,
  type InviteUserWithRoleValues,
} from "@/lib/validations/admin";
import { inviteUserWithRole } from "@/lib/data/invitations";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { ATTENDANCE_ROLE_LABELS, type Branch } from "@/types/domain";

export function InviteUserForm({
  branches,
  canAssignSuperAdmin,
}: {
  branches: Branch[];
  canAssignSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteUserWithRoleValues>({
    resolver: zodResolver(inviteUserWithRoleSchema) as never,
    defaultValues: {
      role: "usher",
      branch_id: undefined,
      finance_permission: false,
      finance_history_permission: true,
    },
  });

  const role = watch("role");
  const isFinanceRole = role === "treasurer" || role === "finance_verifier";
  const isSuperAdminRole = role === "super_admin";
  const assignableRoles = appRoleValues.filter(
    (value) => canAssignSuperAdmin || value !== "super_admin"
  );

  useEffect(() => {
    const hasFinance = isFinanceRole || isSuperAdminRole;
    setValue("finance_permission", hasFinance);
    setValue("finance_history_permission", hasFinance);
    if (isSuperAdminRole) setValue("branch_id", undefined);
  }, [isFinanceRole, isSuperAdminRole, setValue]);

  async function onSubmit(data: InviteUserWithRoleValues) {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      await inviteUserWithRole({
        ...data,
        branch_id: isSuperAdminRole ? undefined : data.branch_id || undefined,
        finance_permission: isSuperAdminRole || isFinanceRole,
        finance_history_permission: isSuperAdminRole
          ? true
          : isFinanceRole
            ? data.finance_history_permission
            : false,
      });

      const branchName = isSuperAdminRole
        ? "All branches"
        : data.branch_id
          ? branches.find((branch) => branch.id === data.branch_id)?.name ?? "Selected branch"
          : "All branches";

      setSuccess(
        `Invite sent to ${data.email} as ${ATTENDANCE_ROLE_LABELS[data.role]} · ${branchName}. Their access is ready when they sign in.`
      );
      reset({
        full_name: "",
        email: "",
        role: "usher",
        branch_id: undefined,
        finance_permission: false,
        finance_history_permission: true,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send invite");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-brand border border-surface-border p-4"
    >
      <div>
        <h2 className="font-semibold">Invite a user</h2>
        <p className="text-sm text-muted mt-1">
          Invite staff or key volunteers into this church and give them their first role before
          they sign in. Additional roles can still be added later.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="invite-name">Full name</Label>
          <Input id="invite-name" {...register("full_name")} />
          <FieldError>{errors.full_name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            {...register("role")}
            className="block w-full rounded-brand border border-surface-border bg-background h-10 px-3 text-sm"
          >
            {assignableRoles.map((value) => (
              <option key={value} value={value}>
                {ATTENDANCE_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
          <FieldError>{errors.role?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="invite-branch">Branch</Label>
          <select
            id="invite-branch"
            {...register("branch_id")}
            disabled={isSuperAdminRole}
            className="block w-full rounded-brand border border-surface-border bg-background h-10 px-3 text-sm disabled:opacity-60"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <FieldError>{errors.branch_id?.message as string | undefined}</FieldError>
        </div>
      </div>

      {isSuperAdminRole && (
        <div className="rounded-brand bg-brand-muted p-3 space-y-1">
          <p className="text-sm font-medium text-brand">Full church access</p>
          <p className="text-xs text-muted">
            Super Admin is church-wide, includes complete finance visibility, all administration,
            and permission to appoint another Super Admin.
          </p>
        </div>
      )}

      {isFinanceRole && !isSuperAdminRole && (
        <div className="rounded-brand bg-surface-border/30 p-3 space-y-2">
          <p className="text-sm font-medium">Finance access included</p>
          <p className="text-xs text-muted">
            This role can work with offering records for the assigned branch scope.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...register("finance_history_permission")}
            />
            Can view past financial records, dashboards and exports
          </label>
        </div>
      )}

      <input type="hidden" {...register("finance_permission")} />

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending invite…" : "Send invite"}
      </Button>
    </form>
  );
}
