"use client";

import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  programmeCorrectionSchema,
  type ProgrammeCorrectionValues,
} from "@/lib/validations/programme";
import { updateProgrammeEntryAction } from "@/lib/data/programmes";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  Input,
  Label,
  NumberField,
  Textarea,
} from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AttendanceRecord,
  Minister,
  ProgrammeOccurrence,
} from "@/types/domain";

export function ProgrammeCorrectionForm({
  programme,
  attendance,
  ministers,
}: {
  programme: ProgrammeOccurrence;
  attendance: AttendanceRecord;
  ministers: Minister[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const availableMinisters = ministers.filter(
    (minister) => minister.active || minister.id === programme.preacher_id
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProgrammeCorrectionValues>({
    resolver: zodResolver(programmeCorrectionSchema) as never,
    defaultValues: {
      programme_name: programme.programme_name,
      classification: programme.classification,
      preacher_type: programme.preacher_id ? "existing" : "none",
      preacher_id: programme.preacher_id ?? undefined,
      guest_preacher_name: "",
      sermon_topic: programme.sermon_topic ?? "",
      men_count: attendance.men_count,
      women_count: attendance.women_count,
      teenagers_count: attendance.teenagers_count,
      children_count: attendance.children_count,
      first_timers_count: attendance.first_timers_count,
      converts_count: attendance.converts_count,
      new_births_count: attendance.new_births_count,
      weddings_count: attendance.weddings_count,
      capacity_exception_note: attendance.capacity_exception_note ?? "",
      outcome_exception_note: attendance.outcome_exception_note ?? "",
      notes: programme.notes ?? "",
    },
  });

  const preacherType = watch("preacher_type");

  async function save(values: ProgrammeCorrectionValues, submit: boolean) {
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      await updateProgrammeEntryAction(
        programme.id,
        programme.version,
        values,
        submit
      );
      setNotice(
        submit
          ? "Correction saved and attendance resubmitted."
          : "Correction saved."
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save the correction"
      );
    } finally {
      setPending(false);
    }
  }

  const resubmitLabel =
    programme.state === "draft" ? "Save & submit" : "Save & resubmit";

  return (
    <Card className="border-brand/30">
      <CardHeader>
        <CardTitle>
          {programme.state === "draft"
            ? "Edit draft attendance"
            : "Correct attendance record"}
        </CardTitle>
      </CardHeader>

      <form className="space-y-5">
        <p className="text-sm text-muted">
          Update the record below. Saving advances the record version, and
          resubmitting records a new digital sign-off.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="correction-programme-name">Programme name</Label>
            <Input
              id="correction-programme-name"
              {...register("programme_name")}
            />
            <FieldError>{errors.programme_name?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="correction-classification">Classification</Label>
            <select
              id="correction-classification"
              {...register("classification")}
              className="block h-11 w-full rounded-brand border border-surface-border bg-background px-3"
            >
              <option value="routine">Routine service</option>
              <option value="special_event">Special event</option>
            </select>
          </div>

          <div>
            <Label htmlFor="correction-preacher-type">Preacher</Label>
            <select
              id="correction-preacher-type"
              {...register("preacher_type")}
              className="block h-11 w-full rounded-brand border border-surface-border bg-background px-3"
            >
              <option value="none">Not recorded</option>
              <option value="existing">Existing minister</option>
              <option value="guest">New guest preacher</option>
            </select>
          </div>

          {preacherType === "existing" && (
            <div>
              <Label htmlFor="correction-preacher">Select preacher</Label>
              <select
                id="correction-preacher"
                {...register("preacher_id")}
                className="block h-11 w-full rounded-brand border border-surface-border bg-background px-3"
              >
                <option value="">Select preacher</option>
                {availableMinisters.map((minister) => (
                  <option key={minister.id} value={minister.id}>
                    {minister.full_name}
                    {minister.is_guest ? " (Guest)" : ""}
                    {!minister.active ? " (Inactive)" : ""}
                  </option>
                ))}
              </select>
              <FieldError>{errors.preacher_id?.message}</FieldError>
            </div>
          )}

          {preacherType === "guest" && (
            <div>
              <Label htmlFor="correction-guest-preacher">
                Guest preacher name
              </Label>
              <Input
                id="correction-guest-preacher"
                {...register("guest_preacher_name")}
              />
              <FieldError>{errors.guest_preacher_name?.message}</FieldError>
            </div>
          )}

          <div className="sm:col-span-2">
            <Label htmlFor="correction-sermon-topic">Sermon topic</Label>
            <Input
              id="correction-sermon-topic"
              {...register("sermon_topic")}
            />
          </div>
        </div>

        <fieldset>
          <legend className="mb-3 font-medium">Attendance</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CountField
              label="Men"
              error={errors.men_count?.message}
              inputProps={register("men_count")}
            />
            <CountField
              label="Women"
              error={errors.women_count?.message}
              inputProps={register("women_count")}
            />
            <CountField
              label="Teenagers"
              error={errors.teenagers_count?.message}
              inputProps={register("teenagers_count")}
            />
            <CountField
              label="Children"
              error={errors.children_count?.message}
              inputProps={register("children_count")}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-medium">Outcomes</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CountField
              label="First-timers"
              error={errors.first_timers_count?.message}
              inputProps={register("first_timers_count")}
            />
            <CountField
              label="Converts"
              error={errors.converts_count?.message}
              inputProps={register("converts_count")}
            />
            <CountField
              label="New births"
              error={errors.new_births_count?.message}
              inputProps={register("new_births_count")}
            />
            <CountField
              label="Weddings"
              error={errors.weddings_count?.message}
              inputProps={register("weddings_count")}
            />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="correction-capacity-note">
              Capacity exception note
            </Label>
            <Textarea
              id="correction-capacity-note"
              {...register("capacity_exception_note")}
            />
          </div>
          <div>
            <Label htmlFor="correction-outcome-note">
              Outcome exception note
            </Label>
            <Textarea
              id="correction-outcome-note"
              {...register("outcome_exception_note")}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="correction-notes">Programme notes</Label>
          <Textarea id="correction-notes" {...register("notes")} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && !error && <p className="text-sm text-success">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={handleSubmit((values) => save(values, false))}
          >
            {pending ? "Saving…" : "Save correction"}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={handleSubmit((values) => save(values, true))}
          >
            {pending ? "Saving…" : resubmitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CountField({
  label,
  error,
  inputProps,
}: {
  label: string;
  error?: string;
  inputProps: UseFormRegisterReturn;
}) {
  const id = `correction-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <NumberField id={id} {...inputProps} />
      <FieldError>{error}</FieldError>
    </div>
  );
}
