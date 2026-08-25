import { subDays, startOfYear, format } from "date-fns";
import { getCurrentUserContext } from "@/lib/data/current-user";
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

const RANGE_LABELS: Record<string, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  year: "This year",
  all: "All time",
  custom: "Custom range",
};

function resolveRange(searchParams: Record<string, string | string[] | undefined>) {
  const today = format(new Date(), "yyyy-MM-dd");
  const rawPreset = searchParams.range;
  const preset = (Array.isArray(rawPreset) ? rawPreset[0] : rawPreset) ?? "90d";

  if (preset === "custom") {
    const rawFrom = searchParams.from;
    const rawTo = searchParams.to;
    const from = (Array.isArray(rawFrom) ? rawFrom[0] : rawFrom) || format(subDays(new Date(), 90), "yyyy-MM-dd");
    const to = (Array.isArray(rawTo) ? rawTo[0] : rawTo) || today;
    return { preset, from, to };
  }
  if (preset === "7d") return { preset, from: format(subDays(new Date(), 7), "yyyy-MM-dd"), to: today };
  if (preset === "30d") return { preset, from: format(subDays(new Date(), 30), "yyyy-MM-dd"), to: today };
  if (preset === "year") return { preset, from: format(startOfYear(new Date()), "yyyy-MM-dd"), to: today };
  if (preset === "all") return { preset, from: "2000-01-01", to: today };
  return { preset: "90d", from: format(subDays(new Date(), 90), "yyyy-MM-dd"), to: today };
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const { preset, from, to } = resolveRange(searchParams);
  const range = { from, to };

  const ctx = await getCurrentUserContext();

  const [attendance, pending, projects] = await Promise.all([
    getAttendanceTrend(range),
    getPendingApprovals(),
    getProjectProgress(),
  ]);

  // hasFinancePermission gates entering/reviewing a service's own offering;
  // hasFinanceHistoryPermission additionally gates dashboards/trends/exports
  // (section: "view past financial records" permission) — a treasurer can
  // have the former without the latter.
  const canSeeFinanceHistory = ctx?.permissions.hasFinanceHistoryPermission() ?? false;
  const revenue = canSeeFinanceHistory ? await getRevenueTrend(range) : [];

  const totalPhysical = revenue.reduce((s, r) => s + r.physical_amount, 0);
  const totalOnline = revenue.reduce((s, r) => s + r.online_amount, 0);
  const totalCombined = totalPhysical + totalOnline;
  const physicalPercent = totalCombined > 0 ? (totalPhysical / totalCombined) * 100 : null;
  const onlinePercent = totalCombined > 0 ? (totalOnline / totalCombined) * 100 : null;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">{RANGE_LABELS[preset] ?? "Last 90 days"} · verified records only</p>
        </div>
        <DateRangeControl preset={preset} from={from} to={to} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-muted">Attendance pending review</p>
          <p className="text-3xl font-semibold mt-1">{pending.attendance_pending}</p>
        </Card>
        {canSeeFinanceHistory && (
          <Card>
            <p className="text-sm text-muted">Finance pending review</p>
            <p className="text-3xl font-semibold mt-1">{pending.finance_pending}</p>
          </Card>
        )}
        <Card>
          <p className="text-sm text-muted">Services (period)</p>
          <p className="text-3xl font-semibold mt-1">{attendance.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Avg. attendance</p>
          <p className="text-3xl font-semibold mt-1">
            {attendance.length > 0
              ? Math.round(attendance.reduce((s, a) => s + a.total_attendance, 0) / attendance.length)
              : "—"}
          </p>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-muted">Total physical giving</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalPhysical, "USD")}</p>
              <p className="text-xs text-muted mt-1">{formatPercent(physicalPercent)} of total</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Total online giving</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalOnline, "USD")}</p>
              <p className="text-xs text-muted mt-1">{formatPercent(onlinePercent)} of total</p>
            </Card>
            <Card className="col-span-2 sm:col-span-2">
              <p className="text-sm text-muted">Combined giving</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalCombined, "USD")}</p>
              <p className="text-xs text-muted mt-1">Physical + online, verified entries in this period</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by category</CardTitle>
              <CardDescription>Verified offerings, stacked by category.</CardDescription>
            </CardHeader>
            <RevenueChart data={revenue} currencyCode="USD" />
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
            {projects.map((p) => (
              <div key={p.category_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted">
                    {formatCurrency(p.cumulative_received, "USD")}
                    {p.target_amount ? ` of ${formatCurrency(p.target_amount, "USD")}` : ""}
                    {" · "}
                    {formatPercent(p.percent_achieved)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-border overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${Math.min(100, p.percent_achieved ?? 0)}%` }}
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
