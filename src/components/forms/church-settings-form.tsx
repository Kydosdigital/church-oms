"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { churchSettingsSchema, type ChurchSettingsValues } from "@/lib/validations/admin";
import { updateChurchSettings } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import type { Church } from "@/types/domain";
import type { LocaleOption } from "@/lib/locales";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function ChurchSettingsForm({
  church,
  timeZones,
  localeOptions,
}: {
  church: Church;
  timeZones: string[];
  localeOptions: LocaleOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChurchSettingsValues>({
    resolver: zodResolver(churchSettingsSchema) as never,
    defaultValues: {
      name: church.name,
      currency_code: church.currency_code,
      timezone: church.timezone,
      locale_code: church.locale_code,
      reporting_year_start_month: church.reporting_year_start_month,
      finance_requires_independent_verification: church.finance_requires_independent_verification,
    },
  });

  async function onSubmit(data: ChurchSettingsValues) {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await updateChurchSettings(data);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-brand border border-surface-border p-4 sm:p-6">
      <div>
        <Label htmlFor="name">Church name</Label>
        <Input id="name" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="currency_code">Currency code</Label>
          <Input id="currency_code" maxLength={3} {...register("currency_code")} />
          <FieldError>{errors.currency_code?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            {...register("timezone")}
            className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <FieldError>{errors.timezone?.message}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="locale_code">Regional date &amp; number format</Label>
        <select
          id="locale_code"
          {...register("locale_code")}
          className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
        >
          {localeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1">
          Controls date order, separators and currency/number formatting across church reports.
        </p>
        <FieldError>{errors.locale_code?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="reporting_year_start_month">Reporting year starts in</Label>
        <select
          id="reporting_year_start_month"
          {...register("reporting_year_start_month")}
          className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1">
          Used for year-to-date figures on dashboards and reports.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 mt-0.5" {...register("finance_requires_independent_verification")} />
        <span>
          Finance records require independent verification
          <span className="block text-xs text-muted">
            When on, the person who submits an offering record can&rsquo;t also verify it — a
            different finance verifier must (separation of duties).
          </span>
        </span>
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && !error && <p className="text-sm text-brand">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
