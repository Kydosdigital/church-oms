"use server";

import { createClient } from "@/lib/supabase/server";
import { givingPerAttendee } from "@/lib/calculations";
import type { DateRange } from "@/lib/data/dashboards";

export interface AttendanceGivingPoint {
  programme_id: string;
  programme_date: string;
  programme_name: string;
  branch_name: string;
  total_attendance: number;
  physical_giving: number;
  online_giving: number;
  total_giving: number;
  giving_per_attendee: number | null;
}

/**
 * Compares only services where both attendance and finance have completed the
 * verified workflow. This avoids presenting provisional figures as business
 * insight. The caller must already have finance-history permission; RLS still
 * applies to every nested row returned by the signed-in Supabase client.
 */
export async function getAttendanceGivingComparison(
  range: DateRange
): Promise<AttendanceGivingPoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programme_occurrences")
    .select(
      "id, programme_date, programme_name, branch_id, branches(name), attendance_records(total_attendance), revenue_entries(physical_amount, online_amount, category_total, state)"
    )
    .eq("state", "verified")
    .eq("finance_state", "verified")
    .gte("programme_date", range.from)
    .lte("programme_date", range.to)
    .order("programme_date");

  if (error) throw error;

  interface ProgrammeComparisonRow {
    id: string;
    programme_date: string;
    programme_name: string;
    branch_id: string;
    branches: { name: string } | null;
    attendance_records: { total_attendance: number }[] | { total_attendance: number } | null;
    revenue_entries:
      | {
          physical_amount: number;
          online_amount: number;
          category_total: number | null;
          state: string;
        }[]
      | null;
  }

  return ((data ?? []) as unknown as ProgrammeComparisonRow[]).flatMap((row) => {
    const attendance = Array.isArray(row.attendance_records)
      ? row.attendance_records[0]
      : row.attendance_records;

    if (!attendance) return [];

    const verifiedRevenue = (row.revenue_entries ?? []).filter(
      (entry) => entry.state === "verified"
    );

    if (verifiedRevenue.length === 0) return [];

    const physicalGiving = verifiedRevenue.reduce(
      (sum, entry) => sum + Number(entry.physical_amount ?? 0),
      0
    );
    const onlineGiving = verifiedRevenue.reduce(
      (sum, entry) => sum + Number(entry.online_amount ?? 0),
      0
    );
    const totalGiving = verifiedRevenue.reduce(
      (sum, entry) =>
        sum +
        Number(
          entry.category_total ??
            Number(entry.physical_amount ?? 0) + Number(entry.online_amount ?? 0)
        ),
      0
    );

    return [
      {
        programme_id: row.id,
        programme_date: row.programme_date,
        programme_name: row.programme_name,
        branch_name: row.branches?.name ?? "Unknown branch",
        total_attendance: Number(attendance.total_attendance ?? 0),
        physical_giving: physicalGiving,
        online_giving: onlineGiving,
        total_giving: totalGiving,
        giving_per_attendee: givingPerAttendee(
          totalGiving,
          Number(attendance.total_attendance ?? 0)
        ),
      },
    ];
  });
}
