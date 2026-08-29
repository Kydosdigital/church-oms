import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { toXlsx } from "@/lib/xlsx";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { parseReportExportRange } from "@/lib/report-export-range";

interface FinanceExportRow {
  physical_amount: number;
  online_amount: number;
  category_total: number;
  state: string;
  notes: string | null;
  offering_categories: { name: string; category_type: string } | null;
  programme_occurrences: {
    programme_date: string;
    programme_name: string;
    branches: { name: string } | null;
  } | null;
}

/** Finance export — REV-08 / 12.3: historical exports require the explicit
 * finance-history permission. RLS still limits the rows, while this route-level
 * check prevents a current-service finance user from bypassing the UI by
 * requesting the export URL directly. */
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");
  const ctx = await getCurrentUserContext();

  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!ctx.user.active) {
    return new Response("Account inactive", { status: 403 });
  }
  if (!ctx.permissions.hasFinanceHistoryPermission()) {
    return new Response("Past-finance permission required", { status: 403 });
  }

  const { range, error: rangeError } = parseReportExportRange(
    request.nextUrl.searchParams
  );
  if (rangeError) {
    return new Response(rangeError, { status: 400 });
  }

  const supabase = await createClient();

  let query = supabase
    .from("revenue_entries")
    .select(
      "physical_amount, online_amount, category_total, state, notes, offering_categories(name, category_type), programme_occurrences!inner(programme_date, programme_name, branches(name))"
    )
    .order("created_at", { ascending: false });

  if (range.from && range.to) {
    query = query
      .gte("programme_occurrences.programme_date", range.from)
      .lte("programme_occurrences.programme_date", range.to);
  }

  const { data } = await query;

  const rows = ((data ?? []) as unknown as FinanceExportRow[]).map((r) => ({
    date: r.programme_occurrences?.programme_date,
    branch: r.programme_occurrences?.branches?.name,
    programme: r.programme_occurrences?.programme_name,
    category: r.offering_categories?.name,
    category_type: r.offering_categories?.category_type,
    physical_amount: r.physical_amount,
    online_amount: r.online_amount,
    category_total: r.category_total,
    state: r.state,
    notes: r.notes,
  }));

  const columns = [
    "date", "branch", "programme", "category", "category_type",
    "physical_amount", "online_amount", "category_total", "state", "notes",
  ] as const;
  const generatedAt = new Date().toISOString();

  if (format === "xlsx") {
    const buffer = new Uint8Array(await toXlsx(rows, [...columns], "Finance"));
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="finance-export-${generatedAt.slice(0, 10)}.xlsx"`,
      },
    });
  }

  const csv = toCsv(rows, [...columns]);

  return new Response(`# Generated ${generatedAt}\n${csv}\n`, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="finance-export-${generatedAt.slice(0, 10)}.csv"`,
    },
  });
}
