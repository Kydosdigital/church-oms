import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

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

/** Finance export — REV-08 / 12.3: only a finance-authorized user can generate
 * this. Enforced by RLS (revenue_select policy requires has_finance_permission()),
 * not by any check in this route — an unpermitted user simply gets zero rows. */
export async function GET() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("revenue_entries")
    .select(
      "physical_amount, online_amount, category_total, state, notes, offering_categories(name, category_type), programme_occurrences(programme_date, programme_name, branches(name))"
    )
    .order("created_at", { ascending: false });

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

  const csv = toCsv(rows, [
    "date", "branch", "programme", "category", "category_type",
    "physical_amount", "online_amount", "category_total", "state", "notes",
  ]);

  const generatedAt = new Date().toISOString();

  return new Response(`# Generated ${generatedAt}\n${csv}\n`, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="finance-export-${generatedAt.slice(0, 10)}.csv"`,
    },
  });
}
