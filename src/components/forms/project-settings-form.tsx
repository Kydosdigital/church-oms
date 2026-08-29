"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  fundraisingProjectSettingsSchema,
  type FundraisingProjectSettingsValues,
} from "@/lib/validations/revenue";
import { updateFundraisingProjectSettings } from "@/lib/data/revenue";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import type { FundraisingProject } from "@/types/domain";

export function ProjectSettingsForm({
  categoryId,
  project,
  currencyCode,
}: {
  categoryId: string;
  project: FundraisingProject;
  currencyCode: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FundraisingProjectSettingsValues>({
    resolver: zodResolver(fundraisingProjectSettingsSchema) as never,
    defaultValues: {
      target_amount: project.target_amount ?? undefined,
      start_date: project.start_date ?? "",
      end_date: project.end_date ?? "",
      accepting_entries_after_end_override:
        project.accepting_entries_after_end_override,
    },
  });

  async function onSubmit(values: FundraisingProjectSettingsValues) {
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      await updateFundraisingProjectSettings(categoryId, values);
      setNotice("Project settings saved.");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update project settings"
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-3 space-y-3 rounded-brand border border-surface-border bg-background p-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`project-target-${categoryId}`}>
            Target amount ({currencyCode})
          </Label>
          <Input
            id={`project-target-${categoryId}`}
            type="number"
            min={0}
            step="0.01"
            {...register("target_amount")}
          />
          <FieldError>{errors.target_amount?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor={`project-start-${categoryId}`}>Start date</Label>
          <Input
            id={`project-start-${categoryId}`}
            type="date"
            {...register("start_date")}
          />
        </div>

        <div>
          <Label htmlFor={`project-end-${categoryId}`}>End date</Label>
          <Input
            id={`project-end-${categoryId}`}
            type="date"
            {...register("end_date")}
          />
          <FieldError>{errors.end_date?.message}</FieldError>
        </div>
      </div>

      <div className="rounded-brand border border-warning/30 bg-warning/5 p-3">
        <label className="flex items-start gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            {...register("accepting_entries_after_end_override")}
          />
          <span>
            Allow new entries after the end date
            <span className="mt-1 block text-xs font-normal text-muted">
              Administrator override. The start date still applies, and every
              change to these project settings is recorded in the audit log.
            </span>
          </span>
        </label>
        <FieldError>
          {errors.accepting_entries_after_end_override?.message}
        </FieldError>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {notice && !error && <p className="text-sm text-success">{notice}</p>}

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving project settings…" : "Save project settings"}
      </Button>
    </form>
  );
}
