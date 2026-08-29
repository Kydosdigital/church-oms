import { createClient } from "@/lib/supabase/server";
import { requireReportsAccess } from "@/lib/route-access";
import { getAttendanceTrend } from "@/lib/data/dashboards";
import { getAttendanceGivingComparison } from "@/lib/data/reports";
import { resolveDashboardRange } from "@/lib/dashboard-range";
import { DateRangeControl } from "@/components/dashboard/date-range-control";
import { AttendanceGivingChart } from "@/components/reports/attendance-giving-chart";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/calculations";
import { formatChurchDate } from "@/lib/locales";

export default async function ReportsPage(props: PageProps<"/reports">) {
  const searchParams = await props.searchParams;
  const ctx = await requireReportsAccess();

  // Financial history, trends and exports are a deliberately stronger
  // permission than entering the current service's offering.
  const canFinance = ctx?.permissions.hasFinanceHistoryPermission() ?? false;

  const supabase = await createClient();
  const { data: church } = ctx?.user.church_id
    ? await supabase
        .from("churches")
        .select("currency_code, locale_code, reporting_year_start_month")
        .eq("id", ctx.user.church_id)
        .single()
    : { data: null };

  const range = resolveDashboardRange(
    searchParams,
    church?.reporting_year_start_month ?? 1
  );
  const currencyCode = church?.currency_code ?? "GBP";
  const localeCode = church?.locale_code ?? "en-GB";
  const query = new URLSearchParams({ from: range.from, to: range.to }).toString();

  const [attendance, comparison] = await Promise.all([
    getAttendanceTrend({ from: range.from, to: range.to }),
    canFinance
      ? getAttendanceGivingComparison({ from: range.from, to: range.to })
      : Promise.resolve([]),
  ]);

  const attendanceTotal = attendance.reduce(
    (sum, point) => sum + point.total_attendance,
    0
  );
  const averageAttendance =
    attendance.length > 0 ? Math.round(attendanceTotal / attendance.length) : null;
  const firstTimers = attendance.reduce(
    (sum, point) => sum + point.first_timers_count,
    0
  );
  const converts = attendance.reduce((sum, point) => sum + point.converts_count, 0);

  const comparedAttendance = comparison.reduce(
    (sum, point) => sum + point.total_attendance,
    0
  );
  const comparedGiving = comparison.reduce(
    (sum, point) => sum + point.total_giving,
    0
  );
  const givingPerAttendee =
    comparedAttendance > 0 ? comparedGiving / comparedAttendance : null;

  return (
    <div className="max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports &amp; downloads</h1>
          <p className="text-sm text-muted">
            {range.label} · verified records only
          </p>
        </div>
        <DateRangeControl preset={range.preset} from={range.from} to={range.to} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Verified services"
          value={attendance.length.toLocaleString(localeCode)}
          note="Attendance workflow completed"
        />
        <Metric
          label="Total attendance"
          value={attendanceTotal.toLocaleString(localeCode)}
          note="Across verified services in this period"
        />
        <Metric
          label="Average attendance"
          value={averageAttendance === null ? "N/A" : averageAttendance.toLocaleString(localeCode)}
          note="Per verified service"
        />
        <Metric
          label="First-timers / converts"
          value={firstTimers.toLocaleString(localeCode) + " / " + converts.toLocaleString(localeCode)}
          note="Verified attendance outcomes"
        />
      </section>

      {canFinance && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Services compared"
              value={comparison.length.toLocaleString(localeCode)}
              note="Both attendance and finance verified"
            />
            <Metric
              label="Compared attendance"
              value={comparedAttendance.toLocaleString(localeCode)}
              note="Attendance behind the giving comparison"
            />
            <Metric
              label="Verified giving"
              value={formatCurrency(comparedGiving, currencyCode, localeCode)}
              note="Across services with both workflows verified"
            />
            <Metric
              label="Giving per attendee"
              value={
                givingPerAttendee === null
                  ? "N/A"
                  : formatCurrency(givingPerAttendee, currencyCode, localeCode)
              }
              note="Verified giving divided by verified attendance"
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Attendance versus giving</CardTitle>
              <CardDescription>
                A service-by-service comparison where both attendance and finance have
                completed verification. Attendance uses the left axis; giving uses the
                right axis.
              </CardDescription>
            </CardHeader>
            <AttendanceGivingChart
              data={comparison}
              currencyCode={currencyCode}
              localeCode={localeCode}
            />
          </Card>

          {comparison.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Service comparison</CardTitle>
                <CardDescription>
                  Giving per attendee is contextual analysis, not a target or performance
                  judgement.
                </CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Service</th>
                      <th className="pb-2 font-medium">Branch</th>
                      <th className="pb-2 text-right font-medium">Attendance</th>
                      <th className="pb-2 text-right font-medium">Giving</th>
                      <th className="pb-2 text-right font-medium">Per attendee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {comparison.map((point) => (
                      <tr key={point.programme_id}>
                        <td className="py-2">
                          {formatChurchDate(point.programme_date, localeCode)}
                        </td>
                        <td className="py-2 font-medium">{point.programme_name}</td>
                        <td className="py-2 text-muted">{point.branch_name}</td>
                        <td className="py-2 text-right">
                          {point.total_attendance.toLocaleString(localeCode)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(point.total_giving, currencyCode, localeCode)}
                        </td>
                        <td className="py-2 text-right">
                          {point.giving_per_attendee === null
                            ? "N/A"
                            : formatCurrency(point.giving_per_attendee, currencyCode, localeCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance dataset</CardTitle>
            <CardDescription>
              Programme-level attendance and calculated totals for the selected period.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            <a href={"/reports/attendance?" + query}>
              <Button variant="outline">Download CSV</Button>
            </a>
            <a href={"/reports/attendance?" + query + "&format=xlsx"}>
              <Button variant="outline">Download Excel</Button>
            </a>
          </div>
        </Card>

        {canFinance && (
          <Card>
            <CardHeader>
              <CardTitle>Finance dataset</CardTitle>
              <CardDescription>
                Category and channel amounts for the selected period. Requires past-finance
                visibility.
              </CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              <a href={"/reports/finance?" + query}>
                <Button variant="outline">Download CSV</Button>
              </a>
              <a href={"/reports/finance?" + query + "&format=xlsx"}>
                <Button variant="outline">Download Excel</Button>
              </a>
            </div>
          </Card>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Programme report</CardTitle>
          <CardDescription>
            Open any programme and use “View printable programme report” for a
            print/PDF-ready page with its digital sign-offs.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </Card>
  );
}

