"use server";

import { createClient } from "@/lib/supabase/server";
import { projectProgressPercent } from "@/lib/calculations";

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
}

export interface AttendanceTrendPoint {
  programme_date: string;
  programme_name: string;
  total_attendance: number;
  men_count: number;
  women_count: number;
  teenagers_count: number;
  children_count: number;
  first_timers_count: number;
  converts_count: number;
  venue_capacity_snapshot: number;
}

/** Section 6.1: operational dashboards use verified records by default. Pass
 * includeUnverified=true only for the explicitly-labelled provisional view. */
export async function getAttendanceTrend(
  range: DateRange,
  { branchId, includeUnverified = false }: { branchId?: string; includeUnverified?: boolean } = {}
): Promise<AttendanceTrendPoint[]> {
  const supabase = await createClient();

  let query = supabase
    .from("programme_occurrences")
    .select(
      "programme_date, programme_name, venue_capacity_snapshot, state, attendance_records(total_attendance, men_count, women_count, teenagers_count, children_count, first_timers_count, converts_count)"
    )
    .gte("programme_date", range.from)
    .lte("programme_date", range.to)
    .order("programme_date");

  if (branchId) query = query.eq("branch_id", branchId);
  if (!includeUnverified) query = query.eq("state", "verified");

  const { data } = await query;

  return (data ?? []).flatMap((row) => {
    const att = Array.isArray(row.attendance_records) ? row.attendance_records[0] : row.attendance_records;
    if (!att) return [];
    return [
      {
        programme_date: row.programme_date,
        programme_name: row.programme_name,
        total_attendance: att.total_attendance,
        men_count: att.men_count,
        women_count: att.women_count,
        teenagers_count: att.teenagers_count,
        children_count: att.children_count,
        first_timers_count: att.first_timers_count,
        converts_count: att.converts_count,
        venue_capacity_snapshot: row.venue_capacity_snapshot,
      },
    ];
  });
}

export interface RevenueTrendPoint {
  programme_date: string;
  category_name: string;
  physical_amount: number;
  online_amount: number;
  category_total: number;
}

/** Revenue dashboards use posted/verified finance records per the church's
 * configured workflow (section 6.1) — here we default to verified. */
export async function getRevenueTrend(range: DateRange, branchId?: string): Promise<RevenueTrendPoint[]> {
  const supabase = await createClient();

  let query = supabase
    .from("revenue_entries")
    .select(
      "physical_amount, online_amount, category_total, offering_categories(name), programme_occurrences!inner(programme_date, branch_id)"
    )
    .eq("state", "verified")
    .gte("programme_occurrences.programme_date", range.from)
    .lte("programme_occurrences.programme_date", range.to);

  if (branchId) query = query.eq("programme_occurrences.branch_id", branchId);

  const { data } = await query;

  interface RevenueTrendRow {
    physical_amount: number;
    online_amount: number;
    category_total: number;
    offering_categories: { name: string } | null;
    programme_occurrences: { programme_date: string; branch_id: string } | null;
  }

  return ((data ?? []) as unknown as RevenueTrendRow[]).map((row) => ({
    programme_date: row.programme_occurrences?.programme_date ?? "",
    category_name: row.offering_categories?.name ?? "Unknown",
    physical_amount: Number(row.physical_amount),
    online_amount: Number(row.online_amount),
    category_total: Number(row.category_total),
  }));
}

export interface ProjectProgressSummary {
  category_id: string;
  name: string;
  target_amount: number | null;
  cumulative_received: number;
  percent_achieved: number | null;
}

export async function getProjectProgress(): Promise<ProjectProgressSummary[]> {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("offering_categories")
    .select("id, name, fundraising_projects(target_amount)")
    .eq("category_type", "project");

  if (!categories) return [];

  interface ProjectCategoryRow {
    id: string;
    name: string;
    fundraising_projects: { target_amount: number | null }[];
  }

  const results: ProjectProgressSummary[] = [];
  for (const cat of categories as unknown as ProjectCategoryRow[]) {
    const { data: entries } = await supabase
      .from("revenue_entries")
      .select("category_total")
      .eq("category_id", cat.id)
      .eq("state", "verified");

    const cumulative = (entries ?? []).reduce(
      (sum: number, e: { category_total: number | null }) => sum + Number(e.category_total ?? 0),
      0
    );
    const target = cat.fundraising_projects?.[0]?.target_amount ?? null;

    results.push({
      category_id: cat.id,
      name: cat.name,
      target_amount: target,
      cumulative_received: cumulative,
      percent_achieved: projectProgressPercent(cumulative, target),
    });
  }

  return results;
}

export interface PendingApprovalSummary {
  attendance_pending: number;
  finance_pending: number;
}

export async function getPendingApprovals(): Promise<PendingApprovalSummary> {
  const supabase = await createClient();

  const [{ count: attendancePending }, { count: financePending }] = await Promise.all([
    supabase.from("programme_occurrences").select("id", { count: "exact", head: true }).eq("state", "submitted"),
    supabase
      .from("programme_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("finance_state", "submitted"),
  ]);

  return {
    attendance_pending: attendancePending ?? 0,
    finance_pending: financePending ?? 0,
  };
}
