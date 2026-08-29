"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const PRESETS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "currentq", label: "Current Q" },
  { value: "q1", label: "Q1" },
  { value: "q2", label: "Q2" },
  { value: "q3", label: "Q3" },
  { value: "q4", label: "Q4" },
  { value: "year", label: "YTD" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
] as const;

export function DateRangeControl({
  preset,
  from,
  to,
}: {
  preset: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCustomFrom(from);
    setCustomTo(to);
    setError(null);
  }, [from, to, preset]);

  function setPreset(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!customFrom || !customTo) {
      setError("Choose both a start and end date.");
      return;
    }
    if (customFrom > customTo) {
      setError("The start date must be on or before the end date.");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={preset === item.value ? "primary" : "outline"}
            onClick={() => setPreset(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {preset === "custom" && (
        <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="range-from">From</Label>
            <Input
              id="range-from"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="h-9 w-40"
            />
          </div>
          <div>
            <Label htmlFor="range-to">To</Label>
            <Input
              id="range-to"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="h-9 w-40"
            />
          </div>
          <Button type="submit" size="sm">
            Apply
          </Button>
          {error && <p className="basis-full text-xs text-danger">{error}</p>}
        </form>
      )}
    </div>
  );
}
