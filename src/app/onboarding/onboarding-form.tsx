"use client";

import { useActionState } from "react";
import { provisionChurch, type OnboardingActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import type { LocaleOption } from "@/lib/locales";

const initialState: OnboardingActionState = {};

const COMMON_CURRENCIES = ["USD", "GBP", "EUR", "NGN", "GHS", "KES", "ZAR", "CAD", "AUD"];

export function OnboardingForm({
  timeZones,
  localeOptions,
}: {
  timeZones: string[];
  localeOptions: LocaleOption[];
}) {
  const [state, formAction, pending] = useActionState(provisionChurch, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Church name</Label>
        <Input id="name" name="name" required placeholder="e.g. Grace Community Church" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            name="currency"
            defaultValue="USD"
            className="block w-full rounded-brand border border-surface-border bg-background px-3 h-11 text-base focus-visible:outline-2 focus-visible:outline-brand"
          >
            {COMMON_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            name="timezone"
            required
            defaultValue="UTC"
            className="block w-full rounded-brand border border-surface-border bg-background px-3 h-11 text-base focus-visible:outline-2 focus-visible:outline-brand"
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="locale">Regional date &amp; number format</Label>
        <select
          id="locale"
          name="locale"
          required
          defaultValue="en-GB"
          className="block w-full rounded-brand border border-surface-border bg-background px-3 h-11 text-base focus-visible:outline-2 focus-visible:outline-brand"
        >
          {localeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted -mt-2">
        Timezone controls when timestamps are shown. Regional format controls date order,
        separators and number/currency formatting. Both can be changed later in Church settings.
      </p>

      <FieldError>{state.error}</FieldError>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Setting up your church…" : "Create church"}
      </Button>
    </form>
  );
}
