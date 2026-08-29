"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { programmeEntrySchema, type ProgrammeEntryValues } from "@/lib/validations/programme";
import {
  totalAttendance,
  capacityUtilization,
  exceedsCapacity,
  outcomesExceedAttendance,
  formatPercent,
} from "@/lib/calculations";
import { createDraftProgramme, submitAttendanceAction, checkDuplicateService } from "@/lib/data/programmes";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { NumberField } from "@/components/ui/input";
import type { Branch, Venue, ServiceType, Minister } from "@/types/domain";

type ReferenceData = {
  branches: Branch[];
  venues: Venue[];
  serviceTypes: ServiceType[];
  ministers: Minister[];
};

const STEPS = ["Service details", "Attendance", "Outcomes", "Notes", "Review"] as const;

export function ProgrammeEntryWizard({ reference }: { reference: ReferenceData }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Branch protection (section: branch verification): when the signed-in
  // usher only has one authorised branch, lock the field to it rather than
  // showing a dropdown — the caller (programmes/new/page.tsx) already scopes
  // reference.branches down to just the branches this user can submit for.
  const lockedBranch = reference.branches.length === 1 ? reference.branches[0] : null;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<ProgrammeEntryValues>({
    // Cast: zod's coerce fields make the resolver's inferred input type
    // diverge slightly from the output type react-hook-form expects at the
    // type level only — runtime coercion/validation behaves correctly.
    resolver: zodResolver(programmeEntrySchema) as never,
    defaultValues: {
      branch_id: lockedBranch?.id,
      classification: "routine",
      preacher_type: "none",
      men_count: 0,
      women_count: 0,
      teenagers_count: 0,
      children_count: 0,
      first_timers_count: 0,
      converts_count: 0,
      new_births_count: 0,
      weddings_count: 0,
      guest_minister_ids: [],
    },
  });

  const values = watch();
  const total = totalAttendance(values);
  const selectedVenue = reference.venues.find((v) => v.id === values.venue_id);
  const capacity = selectedVenue?.default_capacity ?? 0;
  const utilization = capacityUtilization(total, capacity);
  const capacityExceeded = exceedsCapacity(total, capacity);
  const outcomesExceeded = outcomesExceedAttendance(values, total);
  // A venue belongs to exactly one branch — only offer venues for the branch
  // actually selected, so a record can't end up with mismatched branch/venue.
  const venuesForBranch = reference.venues.filter((v) => v.branch_id === values.branch_id);

  // SRV-08: warn (don't block) when another occurrence already exists for
  // this branch/service type/date combination.
  const [duplicate, setDuplicate] = useState<{ id: string; programme_name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!values.branch_id || !values.service_type_id || !values.programme_date) {
      setDuplicate(null);
      return;
    }
    const timer = setTimeout(() => {
      checkDuplicateService(values.branch_id, values.service_type_id, values.programme_date)
        .then((result) => {
          if (!cancelled) setDuplicate(result);
        })
        .catch(() => {
          if (!cancelled) setDuplicate(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [values.branch_id, values.service_type_id, values.programme_date]);

  const stepFields: Record<number, (keyof ProgrammeEntryValues)[]> = {
    0: [
      "branch_id",
      "service_type_id",
      "venue_id",
      "programme_date",
      "programme_name",
      "classification",
      "preacher_type",
      "preacher_id",
      "guest_preacher_name",
    ],
    1: ["men_count", "women_count", "teenagers_count", "children_count"],
    2: ["first_timers_count", "converts_count", "new_births_count", "weddings_count"],
    3: [],
  };

  async function goNext() {
    const fields = stepFields[step];
    const valid = fields ? await trigger(fields) : true;
    if (!valid) return;
    if (step === 0 && !duplicateAcknowledged()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  /** SRV-08: true unless a duplicate is showing and hasn't been acknowledged
   * with an override + reason yet. Surfaces a clear inline error rather than
   * letting the user proceed to a raw server-side rejection. */
  function duplicateAcknowledged(): boolean {
    if (!duplicate) return true;
    if (!values.duplicate_override) {
      setServerError("Confirm the duplicate-service warning above (or change the date/service type) before continuing.");
      return false;
    }
    if (!values.duplicate_override_reason?.trim()) {
      setServerError("Add a reason for the duplicate service before continuing.");
      return false;
    }
    setServerError(null);
    return true;
  }

  async function onSubmit(data: ProgrammeEntryValues) {
    if (!duplicateAcknowledged()) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const programme = await createDraftProgramme(data);
      await submitAttendanceAction(programme.id, programme.version);
      router.push(`/programmes/${programme.id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveDraft(data: ProgrammeEntryValues) {
    if (!duplicateAcknowledged()) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const programme = await createDraftProgramme(data);
      router.push(`/programmes/${programme.id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6">
      {/* Always-visible calculated total (section 8.1) */}
      <div className="sticky top-0 z-10 -mx-4 sm:mx-0 bg-background/95 backdrop-blur border-b border-surface-border px-4 sm:px-0 sm:border-0 sm:bg-transparent py-2 sm:py-0">
        <div className="flex items-center justify-between rounded-brand bg-brand-muted px-4 py-3">
          <span className="text-sm font-medium text-brand">Total attendance</span>
          <span className="text-2xl font-bold text-brand">{total}</span>
        </div>
        {capacity > 0 && (
          <p className="text-xs text-muted mt-1">
            Capacity utilization: {formatPercent(utilization)} of {capacity}
          </p>
        )}
      </div>

      <nav aria-label="Form steps" className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={
              i === step
                ? "font-semibold text-brand underline"
                : i < step
                ? "text-foreground"
                : "text-muted"
            }
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      {step === 0 && (
        <fieldset className="space-y-4">
          <legend className="sr-only">Service details</legend>
          <div>
            <Label htmlFor="branch_id">Branch</Label>
            {lockedBranch ? (
              <>
                <input type="hidden" {...register("branch_id")} />
                <p id="branch_id" className="rounded-brand border border-surface-border bg-surface h-11 px-3 flex items-center text-sm">
                  {lockedBranch.name}
                </p>
              </>
            ) : (
              <select id="branch_id" {...register("branch_id")} className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3">
                <option value="">Select branch</option>
                {reference.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <FieldError>{errors.branch_id?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="service_type_id">Service type</Label>
            <select id="service_type_id" {...register("service_type_id")} className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3">
              <option value="">Select service type</option>
              {reference.serviceTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <FieldError>{errors.service_type_id?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="venue_id">Venue</Label>
            <select
              id="venue_id"
              {...register("venue_id")}
              disabled={!values.branch_id}
              className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3 disabled:opacity-50"
            >
              <option value="">{values.branch_id ? "Select venue" : "Select a branch first"}</option>
              {venuesForBranch.map((v) => (
                <option key={v.id} value={v.id}>{v.name} (capacity {v.default_capacity})</option>
              ))}
            </select>
            <FieldError>{errors.venue_id?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="programme_date">Date</Label>
            <Input id="programme_date" type="date" {...register("programme_date")} />
            <FieldError>{errors.programme_date?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="programme_name">Programme name</Label>
            <Input id="programme_name" placeholder="e.g. Sunday Service — 1st Service" {...register("programme_name")} />
            <FieldError>{errors.programme_name?.message}</FieldError>
          </div>

          {duplicate && (
            <div className="rounded-brand border border-warning bg-warning/10 p-3">
              <p className="text-sm font-medium text-warning">
                ⚠ A service already exists for this branch, service type and date (&ldquo;
                {duplicate.programme_name}&rdquo;). If this is intentional (e.g. a second service or
                a make-up service), confirm below and add a reason.
              </p>
              <label className="flex items-center gap-2 mt-2 text-sm">
                <input type="checkbox" {...register("duplicate_override")} />
                This is intentional, not a mistake
              </label>
              {values.duplicate_override && (
                <>
                  <Textarea
                    className="mt-2"
                    placeholder="Reason (e.g. second Sunday service, make-up midweek service)…"
                    {...register("duplicate_override_reason")}
                  />
                  <FieldError>{errors.duplicate_override_reason?.message}</FieldError>
                </>
              )}
            </div>
          )}
          <div>
            <Label>Classification</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" value="routine" {...register("classification")} /> Routine
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="special_event" {...register("classification")} /> Special event
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <Label htmlFor="preacher_type">Preacher</Label>
              <select
                id="preacher_type"
                {...register("preacher_type")}
                className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
              >
                <option value="none">No preacher recorded</option>
                <option value="existing">Choose an existing preacher</option>
                <option value="guest">Guest / other preacher</option>
              </select>
            </div>

            {values.preacher_type === "existing" && (
              <div>
                <Label htmlFor="preacher_id">Choose preacher</Label>
                <select
                  id="preacher_id"
                  {...register("preacher_id")}
                  className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
                >
                  <option value="">Select preacher</option>
                  {reference.ministers.map((minister) => (
                    <option key={minister.id} value={minister.id}>
                      {minister.full_name}{minister.is_guest ? " (guest)" : ""}
                    </option>
                  ))}
                </select>
                <FieldError>{errors.preacher_id?.message}</FieldError>
              </div>
            )}

            {values.preacher_type === "guest" && (
              <div>
                <Label htmlFor="guest_preacher_name">Guest preacher name</Label>
                <Input
                  id="guest_preacher_name"
                  placeholder="e.g. Pastor Jane Smith"
                  {...register("guest_preacher_name")}
                />
                <p className="text-xs text-muted mt-1">
                  The guest is saved to this church&rsquo;s preacher records so future reports keep
                  a consistent person reference.
                </p>
                <FieldError>{errors.guest_preacher_name?.message}</FieldError>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="sermon_topic">Sermon topic</Label>
            <Input id="sermon_topic" {...register("sermon_topic")} />
          </div>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="space-y-4">
          <legend className="sr-only">Attendance</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="men_count">Men</Label>
              <NumberField id="men_count" {...register("men_count")} />
              <FieldError>{errors.men_count?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="women_count">Women</Label>
              <NumberField id="women_count" {...register("women_count")} />
              <FieldError>{errors.women_count?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="teenagers_count">Teenagers</Label>
              <NumberField id="teenagers_count" {...register("teenagers_count")} />
              <FieldError>{errors.teenagers_count?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="children_count">Children</Label>
              <NumberField id="children_count" {...register("children_count")} />
              <FieldError>{errors.children_count?.message}</FieldError>
            </div>
          </div>

          {capacityExceeded && (
            <div className="rounded-brand border border-warning bg-warning/10 p-3">
              <p className="text-sm font-medium text-warning">
                ⚠ Attendance ({total}) exceeds venue capacity ({capacity}). Add a note to confirm (ATT-06/07).
              </p>
              <Textarea
                className="mt-2"
                placeholder="Explain the capacity exception…"
                {...register("capacity_exception_note")}
              />
            </div>
          )}
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="space-y-4">
          <legend className="sr-only">Outcomes</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_timers_count">First-timers</Label>
              <NumberField id="first_timers_count" {...register("first_timers_count")} />
            </div>
            <div>
              <Label htmlFor="converts_count">Converts</Label>
              <NumberField id="converts_count" {...register("converts_count")} />
            </div>
            <div>
              <Label htmlFor="new_births_count">New births</Label>
              <NumberField id="new_births_count" {...register("new_births_count")} />
            </div>
            <div>
              <Label htmlFor="weddings_count">Weddings</Label>
              <NumberField id="weddings_count" {...register("weddings_count")} />
            </div>
          </div>

          {outcomesExceeded && (
            <div className="rounded-brand border border-warning bg-warning/10 p-3">
              <p className="text-sm font-medium text-warning">
                ⚠ First-timers or converts exceed total attendance. Add a note to confirm (ATT-06/07).
              </p>
              <Textarea
                className="mt-2"
                placeholder="Explain the outcome exception…"
                {...register("outcome_exception_note")}
              />
            </div>
          )}
        </fieldset>
      )}

      {step === 3 && (
        <fieldset className="space-y-4">
          <legend className="sr-only">Notes</legend>
          <div>
            <Label htmlFor="notes">Programme notes</Label>
            <Textarea id="notes" placeholder="Reasons for low turnout, unusual circumstances, etc." {...register("notes")} />
          </div>
        </fieldset>
      )}

      {step === 4 && (
        <ReviewSummary values={values} reference={reference} total={total} />
      )}

      {serverError && (
        <div className="rounded-brand border border-danger bg-danger/10 p-3 text-sm text-danger">{serverError}</div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleSubmit(onSaveDraft)} disabled={submitting}>
            Save draft
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>Next</Button>
          ) : (
            <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
              {submitting ? "Submitting…" : "Sign & submit"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function ReviewSummary({
  values,
  reference,
  total,
}: {
  values: ProgrammeEntryValues;
  reference: ReferenceData;
  total: number;
}) {
  const branch = reference.branches.find((b) => b.id === values.branch_id);
  const venue = reference.venues.find((v) => v.id === values.venue_id);
  const serviceType = reference.serviceTypes.find((s) => s.id === values.service_type_id);
  const preacher =
    values.preacher_type === "guest"
      ? values.guest_preacher_name?.trim() || "—"
      : values.preacher_type === "existing"
        ? reference.ministers.find((minister) => minister.id === values.preacher_id)?.full_name ?? "—"
        : "—";

  const rows: [string, string | number][] = [
    ["Branch", branch?.name ?? "—"],
    ["Service type", serviceType?.name ?? "—"],
    ["Venue", venue?.name ?? "—"],
    ["Date", values.programme_date],
    ["Programme name", values.programme_name],
    ["Classification", values.classification === "routine" ? "Routine" : "Special event"],
    ["Preacher", preacher],
    ["Sermon topic", values.sermon_topic || "—"],
    ["Total attendance", total],
    ["Men / Women / Teenagers / Children", `${values.men_count} / ${values.women_count} / ${values.teenagers_count} / ${values.children_count}`],
    ["First-timers / Converts", `${values.first_timers_count} / ${values.converts_count}`],
    ["New births / Weddings", `${values.new_births_count} / ${values.weddings_count}`],
    ["Notes", values.notes || "—"],
  ];

  if (values.duplicate_override) {
    rows.push(["Duplicate service reason", values.duplicate_override_reason || "—"]);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Review before signing</h2>
      <dl className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 p-3 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted mt-3">
        Submitting records your authenticated name, timestamp and record version as your digital
        sign-off (APR-02). A different authorized user must verify this record.
      </p>
    </div>
  );
}
