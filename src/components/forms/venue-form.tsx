"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { venueSchema, type VenueValues } from "@/lib/validations/admin";
import { createVenue } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function VenueForm({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VenueValues>({
    resolver: zodResolver(venueSchema) as never,
    defaultValues: { branch_id: branchId },
  });

  async function onSubmit(data: VenueValues) {
    setPending(true);
    setError(null);
    try {
      await createVenue(data);
      reset({ branch_id: branchId, name: "", default_capacity: undefined });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create venue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-2 pt-2">
      <input type="hidden" {...register("branch_id")} />
      <div className="flex-1 min-w-32">
        <Label htmlFor={`venue-name-${branchId}`}>Venue name</Label>
        <Input id={`venue-name-${branchId}`} placeholder="e.g. Main Hall" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <div className="w-32">
        <Label htmlFor={`venue-capacity-${branchId}`}>Default capacity</Label>
        <Input id={`venue-capacity-${branchId}`} type="number" min={1} {...register("default_capacity")} />
        <FieldError>{errors.default_capacity?.message}</FieldError>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add venue"}
      </Button>
      {error && <p className="text-sm text-danger w-full">{error}</p>}
    </form>
  );
}