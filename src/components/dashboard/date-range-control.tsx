"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const PRESETS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
] as const;

export function DateRangeControl({ preset, from, to }: { preset: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPreset(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustom(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", nextFrom);
    params.set("to", nextTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            size="sm"
            variant={preset === p.value ? "primary" : "outline"}
            onClick={() => setPreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="range-from">From</Label>
            <Input id="range-from" type="date" defaultValue={from} className="h-9 w-40" onBlur={(e) => applyCustom(e.target.value, to)} />
          </div>
          <div>
            <Label htmlFor="range-to">To</Label>
            <Input id="range-to" type="date" defaultValue={to} className="h-9 w-40" onBlur={(e) => applyCustom(from, e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
