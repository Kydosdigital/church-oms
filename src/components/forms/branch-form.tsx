"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { branchSchema, type BranchValues } from "@/lib/validations/admin";
import { createBranch } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function BranchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchValues>({
    resolver: zodResolver(branchSchema) as never,
    defaultValues: { is_primary: false },
  });

  async function onSubmit(data: BranchValues) {
    setPending(true);
    setError(null);
    try {
      await createBranch(data);
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create branch");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-brand border border-surface-border p-4">
      <h2 className="font-semibold">New branch</h2>
      <div>
        <Label htmlFor="branch-name">Name</Label>
        <Input id="branch-name" placeholder="e.g. North Campus" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" {...register("is_primary")} />
        Primary branch
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create branch"}
      </Button>
    </form>
  );
}
