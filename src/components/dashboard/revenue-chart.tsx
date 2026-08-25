"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { RevenueTrendPoint } from "@/lib/data/dashboards";

const PALETTE = ["var(--brand)", "var(--success)", "var(--warning)", "var(--info)", "var(--danger)"];

export function RevenueChart({ data, currencyCode }: { data: RevenueTrendPoint[]; currencyCode: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No verified revenue records in this period yet.</p>;
  }

  // Pivot into { date, [category]: total } rows so each category renders as
  // its own accessibly-labelled bar series.
  const byDate = new Map<string, Record<string, number>>();
  const categories = new Set<string>();
  for (const row of data) {
    categories.add(row.category_name);
    const bucket = byDate.get(row.programme_date) ?? {};
    bucket[row.category_name] = (bucket[row.category_name] ?? 0) + row.category_total;
    byDate.set(row.programme_date, bucket);
  }
  const chartData = Array.from(byDate.entries())
    .map(([programme_date, values]) => ({ programme_date, ...values }))
    .sort((a, b) => a.programme_date.localeCompare(b.programme_date));

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
        <XAxis dataKey="programme_date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatter.format(v)} width={80} />
        <Tooltip formatter={(v) => formatter.format(Number(v))} />
        <Legend />
        {Array.from(categories).map((cat, i) => (
          <Bar key={cat} dataKey={cat} stackId="revenue" fill={PALETTE[i % PALETTE.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
