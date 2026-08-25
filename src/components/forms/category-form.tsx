"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { offeringCategorySchema, type OfferingCategoryValues } from "@/lib/validations/revenue";
import { createOfferingCategory } from "@/lib/data/revenue";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";

export function CategoryForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<OfferingCategoryValues>({
    // Cast: zod's coerce/default fields make the resolver's inferred input
    // type diverge slightly from the output type react-hook-form expects.
    // Runtime behavior is unaffected — see programme-entry-wizard.tsx for
    // the same pattern.
    resolver: zodResolver(offeringCategorySchema) as never,
    defaultValues: { category_type: "general", applies_to_all_service_types: true, service_type_ids: [] },
  });

  const categoryType = watch("category_type");

  async function onSubmit(data: OfferingCategoryValues) {
    setPending(true);
    setError(null);
    try {
      await createOfferingCategory(data);
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create category");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-brand border border-surface-border p-4">
      <h2 className="font-semibold">New offering category</h2>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="e.g. Missions" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>
      <div>
        <Label htmlFor="category_type">Type</Label>
        <select id="category_type" {...register("category_type")} className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3">
          <option value="general">General</option>
          <option value="project">Project-based</option>
          <option value="special">Special</option>
        </select>
      </div>
      {categoryType === "project" && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="target_amount">Target amount</Label>
            <Input id="target_amount" type="number" min={0} step="0.01" {...register("target_amount")} />
          </div>
          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" {...register("start_date")} />
          </div>
          <div>
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create category"}</Button>
    </form>
  );
}
