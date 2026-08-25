"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { userRoleSchema, appRoleValues, type UserRoleValues } from "@/lib/validations/admin";
import { assignUserRole } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Label, FieldError } from "@/components/ui/input";
import { ATTENDANCE_ROLE_LABELS } from "@/types/domain";
import type { Branch } from "@/types/domain";

export function UserRoleForm({ userId, branches }: { userId: string; branches: Branch[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserRoleValues>({
    resolver: zodResolver(userRoleSchema) as never,
    defaultValues: { user_id: userId, role: "usher", finance_permission: false },
  });

  async function onSubmit(data: UserRoleValues) {
    setPending(true);
    setError(null);
    try {
      await assignUserRole({ ...data, branch_id: data.branch_id || undefined });
      reset({ user_id: userId, role: "usher", branch_id: undefined, finance_permission: false });
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
          {appRoleValues.map((r) => (
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
          className="block rounded-brand border border-surface-border bg-background h-9 px-2 text-sm"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-1.5 text-sm h-9">
        <input type="checkbox" className="h-4 w-4" {...register("finance_permission")} />
        Finance access
      </label>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Assigning…" : "Assign role"}
      </Button>
      {error && <p className="text-sm text-danger w-full">{error}</p>}
      <FieldError>{errors.role?.message}</FieldError>
    </form>
  );
}
