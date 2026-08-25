import { subDays, format } from "date-fns";
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
import { formatCurrency, formatPercent } from "@/lib/calculations";

export default async function DashboardPage() {
  const ctx = await getCurrentUserContext();
  const range = {
    from: format(subDays(new Date(), 90), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  };

  const [attendance, pending, projects] = await Promise.all([
    getAttendanceTrend(range),
    getPendingApprovals(),
    getProjectProgress(),
  ]);

  const canSeeFinance = ctx?.permissions.hasFinancePermission() ?? false;
  const revenue = canSeeFinance ? await getRevenueTrend(range) : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Last 90 days · verified records only</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-muted">Attendance pending review</p>
          <p className="text-3xl font-semibold mt-1">{pending.attendance_pending}</p>
        </Card>
        {canSeeFinance && (
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

      {canSeeFinance && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
            <CardDescription>Verified offerings, stacked by category.</CardDescription>
          </CardHeader>
          <RevenueChart data={revenue} currencyCode="USD" />
        </Card>
      )}

      {canSeeFinance && projects.length > 0 && (
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
    </div>
  );
}
