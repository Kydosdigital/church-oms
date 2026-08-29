"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  offeringCategorySchema,
  type OfferingCategoryValues,
} from "@/lib/validations/revenue";
import { createOfferingCategory } from "@/lib/data/revenue";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import type { ServiceType } from "@/types/domain";

export function CategoryForm({ serviceTypes }: { serviceTypes: ServiceType[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<OfferingCategoryValues>({
    resolver: zodResolver(offeringCategorySchema) as never,
    defaultValues: {
      category_type: "general",
      applies_to_all_service_types: true,
      service_type_ids: [],
      accepting_entries_after_end_override: false,
    },
  });

  const categoryType = watch("category_type");
  const appliesToAllServiceTypes = watch("applies_to_all_service_types");

  async function onSubmit(data: OfferingCategoryValues) {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await createOfferingCategory(data);
      reset();
      setNotice("Offering category created.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create category");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-brand border border-surface-border p-4"
    >
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
        <select
          id="category_type"
          {...register("category_type")}
          className="block h-11 w-full rounded-brand border border-surface-border bg-background px-3"
        >
          <option value="general">General</option>
          <option value="project">Project-based</option>
          <option value="special">Special</option>
        </select>
      </div>

      <div className="space-y-2 rounded-brand border border-surface-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4"
            {...register("applies_to_all_service_types")}
          />
          Available for all service types
        </label>
        <p className="text-xs text-muted">
          Turn this off when a giving category should only appear for selected service types.
        </p>

        {!appliesToAllServiceTypes && (
          <fieldset className="space-y-2 pt-2">
            <legend className="text-sm font-medium">Select service types</legend>
            {serviceTypes.length === 0 ? (
              <p className="text-sm text-warning">
                No active service types are available. Add or reactivate a service type first.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {serviceTypes.map((serviceType) => (
                  <label
                    key={serviceType.id}
                    className="flex items-center gap-2 rounded-brand border border-surface-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={serviceType.id}
                      className="h-4 w-4"
                      {...register("service_type_ids")}
                    />
                    {serviceType.name}
                  </label>
                ))}
              </div>
            )}
            <FieldError>{errors.service_type_ids?.message}</FieldError>
          </fieldset>
        )}
      </div>

      {categoryType === "project" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="target_amount">Target amount</Label>
            <Input
              id="target_amount"
              type="number"
              min={0}
              step="0.01"
              {...register("target_amount")}
            />
          </div>
          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" {...register("start_date")} />
          </div>
          <div>
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
            <FieldError>{errors.end_date?.message}</FieldError>
          </div>

          <div className="sm:col-span-3 rounded-brand border border-warning/30 bg-warning/5 p-3">
            <label className="flex items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                {...register("accepting_entries_after_end_override")}
              />
              <span>
                Allow new entries after the project end date
                <span className="mt-1 block text-xs font-normal text-muted">
                  Administrator override. Use only when this project is intentionally continuing
                  beyond its configured end date. Changes are recorded in the audit log.
                </span>
              </span>
            </label>
            <FieldError>
              {errors.accepting_entries_after_end_override?.message}
            </FieldError>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && !error && <p className="text-sm text-brand">{notice}</p>}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating category…" : "Create category"}
      </Button>
    </form>
  );
}
