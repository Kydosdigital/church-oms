import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StateBadge } from "@/components/ui/badge";
import type { RecordState } from "@/types/domain";

interface RevenueListRow {
  id: string;
  programme_name: string;
  programme_date: string;
  state: RecordState;
  revenue_entries: { state: RecordState }[];
}

export default async function RevenueListPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programme_occurrences")
    .select("id, programme_name, programme_date, state, revenue_entries(state)")
    .order("programme_date", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as RevenueListRow[];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Revenue</h1>
        <p className="text-sm text-muted">Enter or review summarized offerings by programme.</p>
      </div>

      <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted">No programmes yet.</p>
        )}
        {rows.map((p) => {
          const financeState = p.revenue_entries?.[0]?.state ?? "draft";
          return (
            <Link
              key={p.id}
              href={`/revenue/${p.id}`}
              className="flex items-center justify-between p-4 hover:bg-surface"
            >
              <div>
                <p className="font-medium">{p.programme_name}</p>
                <p className="text-sm text-muted">{p.programme_date}</p>
              </div>
              <StateBadge state={financeState} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
