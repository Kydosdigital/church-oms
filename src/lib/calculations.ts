import type { AttendanceCounts } from "@/types/domain";

/** Total attendance = Men + Women + Teenagers + Children (ATT-02). */
export function totalAttendance(c: Pick<AttendanceCounts, "men_count" | "women_count" | "teenagers_count" | "children_count">): number {
  return c.men_count + c.women_count + c.teenagers_count + c.children_count;
}

/** Capacity utilization = total attendance / venue capacity x 100 (ATT-04, section 6). */
export function capacityUtilization(total: number, capacity: number): number | null {
  if (!capacity || capacity <= 0) return null;
  return (total / capacity) * 100;
}

/** Attendance exceeds capacity — requires a note before submission (ATT-06/07). */
export function exceedsCapacity(total: number, capacity: number): boolean {
  return capacity > 0 && total > capacity;
}

/** First-timers or converts exceeding total attendance — requires a note (ATT-06/07). */
export function outcomesExceedAttendance(c: AttendanceCounts, total: number): boolean {
  return c.first_timers_count > total || c.converts_count > total;
}

/** Attendance change vs. previous comparable period (section 6). */
export function attendanceChange(current: number, previous: number): number {
  return current - previous;
}

/** Growth rate = (current - previous) / previous x 100; N/A when previous is 0. */
export function attendanceGrowthRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** First-timer rate = first-timers / total attendance x 100. */
export function firstTimerRate(firstTimers: number, total: number): number | null {
  if (total === 0) return null;
  return (firstTimers / total) * 100;
}

/** Convert rate = converts / total attendance x 100. */
export function convertRate(converts: number, total: number): number | null {
  if (total === 0) return null;
  return (converts / total) * 100;
}

/** Category revenue = physical + online (REV-04). Uses integer cents internally
 *  to avoid floating-point money errors (section 6.1); inputs/outputs are
 *  plain decimal amounts (the DB stores NUMERIC(14,2), this is client-side
 *  display/aggregation only). */
export function categoryTotal(physical: number, online: number): number {
  const cents = Math.round(physical * 100) + Math.round(online * 100);
  return cents / 100;
}

/** Project progress % = cumulative amount received / target x 100.
 *  Returns null when no target is configured (show cumulative amount only). */
export function projectProgressPercent(cumulativeReceived: number, target: number | null): number | null {
  if (target === null || target <= 0) return null;
  return (cumulativeReceived / target) * 100;
}

/** Giving per attendee for a verified service. Returns null when attendance is
 * zero so reports show N/A rather than an invalid/infinite value. */
export function givingPerAttendee(totalGiving: number, totalAttendance: number): number | null {
  if (totalAttendance <= 0) return null;
  return totalGiving / totalAttendance;
}

export function formatCurrency(amount: number, currencyCode: string, locale = "en-GB"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).format(amount);
}

export function formatPercent(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(fractionDigits)}%`;
}
