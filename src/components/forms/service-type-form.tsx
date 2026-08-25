"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { serviceTypeSchema, type ServiceTypeValues } from "@/lib/validations/admin";
import { createServiceType } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function ServiceTypeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceTypeValues>({ resolver: zodResolver(serviceTypeSchema) as never });

  async function onSubmit(data: ServiceTypeValues) {
    setPending(true);
    setError(null);
    try {
      await createServiceType(data);
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create service type");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-40">
        <Label htmlFor="service-type-name">New service type</Label>
        <Input id="service-type-name" placeholder="e.g. Midweek Service" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
      {error && <p className="text-sm text-danger w-full">{error}</p>}
    </form>
  );
}
