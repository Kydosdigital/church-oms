import {
  addMonths,
  endOfMonth,
  format,
  isValid,
  parseISO,
  subDays,
} from "date-fns";

export type DashboardPreset =
  | "7d"
  | "30d"
  | "90d"
  | "year"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "currentq"
  | "all"
  | "custom";

export interface DashboardRange {
  preset: DashboardPreset;
  from: string;
  to: string;
  label: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function reportingYearStart(now: Date, startMonth: number) {
  const monthIndex = Math.min(12, Math.max(1, startMonth)) - 1;
  const startYear = now.getMonth() >= monthIndex ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(startYear, monthIndex, 1);
}

function quarterRange(now: Date, startMonth: number, quarter: number) {
  const yearStart = reportingYearStart(now, startMonth);
  const start = addMonths(yearStart, (quarter - 1) * 3);
  const end = endOfMonth(addMonths(start, 2));
  return { start, end };
}

function currentQuarterNumber(now: Date, startMonth: number) {
  const startIndex = Math.min(12, Math.max(1, startMonth)) - 1;
  const monthsSinceStart = (now.getMonth() - startIndex + 12) % 12;
  return Math.floor(monthsSinceStart / 3) + 1;
}

function quarterLabel(quarter: number, start: Date, end: Date) {
  return `Q${quarter} · ${format(start, "MMM")}–${format(end, "MMM yyyy")}`;
}

function validIsoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return isValid(parseISO(value));
}

export function resolveDashboardRange(
  searchParams: SearchParams,
  reportingYearStartMonth: number,
  now = new Date()
): DashboardRange {
  const today = format(now, "yyyy-MM-dd");
  const rawPreset = paramValue(searchParams.range);
  const supported: DashboardPreset[] = [
    "7d",
    "30d",
    "90d",
    "year",
    "q1",
    "q2",
    "q3",
    "q4",
    "currentq",
    "all",
    "custom",
  ];
  const preset: DashboardPreset = supported.includes(rawPreset as DashboardPreset)
    ? (rawPreset as DashboardPreset)
    : "90d";

  if (preset === "custom") {
    const from = paramValue(searchParams.from);
    const to = paramValue(searchParams.to);
    if (validIsoDate(from) && validIsoDate(to) && from! <= to!) {
      return { preset, from: from!, to: to!, label: "Custom range" };
    }

    // Entering Custom for the first time should reveal sensible editable
    // defaults rather than bouncing the user back to the 90-day preset.
    return {
      preset: "custom",
      from: format(subDays(now, 90), "yyyy-MM-dd"),
      to: today,
      label: "Custom range",
    };
  }

  if (preset === "7d") {
    return {
      preset,
      from: format(subDays(now, 7), "yyyy-MM-dd"),
      to: today,
      label: "Last 7 days",
    };
  }

  if (preset === "30d") {
    return {
      preset,
      from: format(subDays(now, 30), "yyyy-MM-dd"),
      to: today,
      label: "Last 30 days",
    };
  }

  if (preset === "90d") {
    return {
      preset,
      from: format(subDays(now, 90), "yyyy-MM-dd"),
      to: today,
      label: "Last 90 days",
    };
  }

  if (preset === "year") {
    const start = reportingYearStart(now, reportingYearStartMonth);
    return {
      preset,
      from: format(start, "yyyy-MM-dd"),
      to: today,
      label:
        reportingYearStartMonth === 1
          ? "Year to date"
          : `Reporting year to date · from ${format(start, "d MMM yyyy")}`,
    };
  }

  if (preset === "all") {
    return { preset, from: "2000-01-01", to: today, label: "All time" };
  }

  const quarter =
    preset === "currentq" ? currentQuarterNumber(now, reportingYearStartMonth) : Number(preset.slice(1));
  const { start, end } = quarterRange(now, reportingYearStartMonth, quarter);

  return {
    preset,
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
    label:
      preset === "currentq"
        ? `Current quarter · ${quarterLabel(quarter, start, end)}`
        : quarterLabel(quarter, start, end),
  };
}
