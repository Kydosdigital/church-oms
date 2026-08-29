import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { toXlsx } from "@/lib/xlsx";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { canAccessReports } from "@/lib/route-access";
import { parseReportExportRange } from "@/lib/report-export-range";

interface AttendanceExportRow {
  programme_date: string;
  programme_name: string;
  classification: string;
  state: string;
  branches: { name: string } | null;
  attendance_records: {
    total_attendance: number;
    men_count: number;
    women_count: number;
    teenagers_count: number;
    children_count: number;
    first_timers_count: number;
    converts_count: number;
    new_births_count: number;
    weddings_count: number;
  }[];
}

/** Permission-controlled attendance export (section 5.4). The Supabase client
 * here is the caller's own session, so RLS applies exactly as it does in the
 * UI — a user without branch/attendance access simply gets no rows, never a
 * server-side bypass. */
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!ctx.user.active || !canAccessReports(ctx)) {
    return new Response("Reports permission required", { status: 403 });
  }

  const { range, error: rangeError } = parseReportExportRange(
    request.nextUrl.searchParams
  );
  if (rangeError) {
    return new Response(rangeError, { status: 400 });
  }

  const supabase = await createClient();

  let query = supabase
    .from("programme_occurrences")
    .select(
      "programme_date, programme_name, classification, state, branches(name), attendance_records(total_attendance, men_count, women_count, teenagers_count, children_count, first_timers_count, converts_count, new_births_count, weddings_count)"
    )
    .order("programme_date", { ascending: false });

  if (range.from && range.to) {
    query = query.gte("programme_date", range.from).lte("programme_date", range.to);
  }

  const { data } = await query;

  const rows = ((data ?? []) as unknown as AttendanceExportRow[]).map((p) => ({
    date: p.programme_date,
    branch: p.branches?.name,
    programme: p.programme_name,
    classification: p.classification,
    state: p.state,
    total_attendance: p.attendance_records?.[0]?.total_attendance,
    men: p.attendance_records?.[0]?.men_count,
    women: p.attendance_records?.[0]?.women_count,
    teenagers: p.attendance_records?.[0]?.teenagers_count,
    children: p.attendance_records?.[0]?.children_count,
    first_timers: p.attendance_records?.[0]?.first_timers_count,
    converts: p.attendance_records?.[0]?.converts_count,
    new_births: p.attendance_records?.[0]?.new_births_count,
    weddings: p.attendance_records?.[0]?.weddings_count,
  }));

  const columns = [
    "date", "branch", "programme", "classification", "state", "total_attendance",
    "men", "women", "teenagers", "children", "first_timers", "converts", "new_births", "weddings",
  ] as const;
  const generatedAt = new Date().toISOString();

  if (format === "xlsx") {
    const buffer = new Uint8Array(await toXlsx(rows, [...columns], "Attendance"));
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance-export-${generatedAt.slice(0, 10)}.xlsx"`,
      },
    });
  }

  const csv = toCsv(rows, [...columns]);

  return new Response(`# Generated ${generatedAt}\n${csv}\n`, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="attendance-export-${generatedAt.slice(0, 10)}.csv"`,
    },
  });
}
