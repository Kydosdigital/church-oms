import Link from "next/link";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import {
  getAttendanceTrend,
  getRevenueTrend,
  getProjectProgress,
  getPendingApprovals,
} from "@/lib/data/dashboards";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DateRangeControl } from "@/components/dashboard/date-range-control";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import { resolveDashboardRange } from "@/lib/dashboard-range";

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const ctx = await getCurrentUserContext();
  const rawAccess = Array.isArray(searchParams.access)
    ? searchParams.access[0]
    : searchParams.access;
  const deniedArea =
    rawAccess === "admin" ||
    rawAccess === "programmes" ||
    rawAccess === "revenue" ||
    rawAccess === "reports"
      ? rawAccess
      : null;

  const supabase = await createClient();
  const { data: church } = ctx?.user.church_id
    ? await supabase
        .from("churches")
        .select("currency_code, locale_code, reporting_year_start_month")
        .eq("id", ctx.user.church_id)
        .single()
    : { data: null };

  const { preset, from, to, label: rangeLabel } = resolveDashboardRange(
    searchParams,
    church?.reporting_year_start_month ?? 1
  );
  const range = { from, to };
  const currencyCode = church?.currency_code ?? "GBP";
  const localeCode = church?.locale_code ?? "en-GB";

  // hasFinancePermission gates entering/reviewing a service's own offering;
  // hasFinanceHistoryPermission additionally gates dashboards/trends/exports
  // (section: "view past financial records" permission). Do not even request
  // historical project totals unless that stronger permission is present.
  const canSeeFinanceHistory = ctx?.permissions.hasFinanceHistoryPermission() ?? false;

  const [attendance, pending, projects, revenue] = await Promise.all([
    getAttendanceTrend(range),
    getPendingApprovals(),
    canSeeFinanceHistory ? getProjectProgress() : Promise.resolve([]),
    canSeeFinanceHistory ? getRevenueTrend(range) : Promise.resolve([]),
  ]);

  const totalPhysical = revenue.reduce((sum, row) => sum + row.physical_amount, 0);
  const totalOnline = revenue.reduce((sum, row) => sum + row.online_amount, 0);
  const totalCombined = totalPhysical + totalOnline;
  const physicalPercent = totalCombined > 0 ? (totalPhysical / totalCombined) * 100 : null;
  const onlinePercent = totalCombined > 0 ? (totalOnline / totalCombined) * 100 : null;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      {deniedArea && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="font-medium">You do not have access to {accessAreaLabel(deniedArea)}.</p>
          <p className="mt-1 text-sm text-muted">
            Your church role does not include this area. If you need access, ask an
            Administrator or Super Admin to update your role.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">{rangeLabel} · verified records only</p>
        </div>
        <DateRangeControl preset={preset} from={from} to={to} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/programmes?review=attendance" className="block group">
          <Card className="h-full transition-colors group-hover:border-brand/40 group-hover:bg-brand-muted/20">
            <p className="text-sm text-muted">Attendance pending review</p>
            <p className="text-3xl font-semibold mt-1">{pending.attendance_pending}</p>
            <p className="mt-2 text-xs text-muted">
              Submitted service records waiting for attendance verification.
            </p>
            <p className="mt-3 text-sm font-medium text-brand">Open review queue →</p>
          </Card>
        </Link>

        {canSeeFinanceHistory && (
          <Link href="/programmes?review=finance" className="block group">
            <Card className="h-full transition-colors group-hover:border-brand/40 group-hover:bg-brand-muted/20">
              <p className="text-sm text-muted">Finance pending review</p>
              <p className="text-3xl font-semibold mt-1">{pending.finance_pending}</p>
              <p className="mt-2 text-xs text-muted">
                Programmes with submitted finance records waiting for verification.
              </p>
              <p className="mt-3 text-sm font-medium text-brand">Open review queue →</p>
            </Card>
          </Link>
        )}

        <Card>
          <p className="text-sm text-muted">Services (period)</p>
          <p className="text-3xl font-semibold mt-1">{attendance.length}</p>
          <p className="mt-2 text-xs text-muted">Verified services inside the selected reporting range.</p>
        </Card>

        <Card>
          <p className="text-sm text-muted">Avg. attendance</p>
          <p className="text-3xl font-semibold mt-1">
            {attendance.length > 0
              ? Math.round(
                  attendance.reduce((sum, row) => sum + row.total_attendance, 0) /
                    attendance.length
                )
              : "—"}
          </p>
          <p className="mt-2 text-xs text-muted">Average across verified services in this period.</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance trend</CardTitle>
          <CardDescription>Total attendance, first-timers and converts across verified services.</CardDescription>
        </CardHeader>
        <AttendanceChart data={attendance} />
      </Card>

      {canSeeFinanceHistory && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-muted">Total physical giving</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalPhysical, currencyCode, localeCode)}</p>
              <p className="text-xs text-muted mt-1">{formatPercent(physicalPercent)} of total</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Total online giving</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalOnline, currencyCode, localeCode)}</p>
              <p className="text-xs text-muted mt-1">{formatPercent(onlinePercent)} of total</p>
            </Card>
            <Card className="sm:col-span-2">
              <p className="text-sm text-muted">Combined giving</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalCombined, currencyCode, localeCode)}</p>
              <p className="text-xs text-muted mt-1">Physical + online, verified entries in this period</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by category</CardTitle>
              <CardDescription>Verified offerings, stacked by category.</CardDescription>
            </CardHeader>
            <RevenueChart
              data={revenue}
              currencyCode={currencyCode}
              localeCode={localeCode}
            />
          </Card>
        </>
      )}

      {canSeeFinanceHistory && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project progress</CardTitle>
            <CardDescription>Fundraising projects against their targets.</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.category_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-muted">
                    {formatCurrency(project.cumulative_received, currencyCode, localeCode)}
                    {project.target_amount
                      ? ` of ${formatCurrency(project.target_amount, currencyCode, localeCode)}`
                      : ""}
                    {" · "}
                    {formatPercent(project.percent_achieved)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-border overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${Math.min(100, project.percent_achieved ?? 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!canSeeFinanceHistory && (ctx?.permissions.hasFinancePermission() ?? false) && (
        <Card>
          <CardDescription>
            Your finance access is limited to entering and reviewing the current service&rsquo;s offering.
            Dashboards, trends and past amounts aren&rsquo;t shown — an administrator can enable this from
            Users &amp; roles.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}

function accessAreaLabel(area: "admin" | "programmes" | "revenue" | "reports") {
  if (area === "admin") return "church administration";
  if (area === "programmes") return "programmes";
  if (area === "revenue") return "revenue";
  return "reports";
}
