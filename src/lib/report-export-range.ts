import { isValid, parseISO } from "date-fns";

export interface ReportExportRange {
  from?: string;
  to?: string;
}

function validDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return isValid(parseISO(value));
}

export function parseReportExportRange(
  searchParams: URLSearchParams
): { range: ReportExportRange; error: string | null } {
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from && !to) {
    return { range: {}, error: null };
  }

  if (!validDate(from) || !validDate(to)) {
    return {
      range: {},
      error: "Both from and to must be valid dates in YYYY-MM-DD format.",
    };
  }

  if (from! > to!) {
    return {
      range: {},
      error: "The report start date must be on or before the end date.",
    };
  }

  return {
    range: { from: from!, to: to! },
    error: null,
  };
}
