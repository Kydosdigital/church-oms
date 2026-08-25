import { getCurrentUserContext } from "@/lib/data/current-user";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ReportsPage() {
  const ctx = await getCurrentUserContext();
  // Financial exports require history permission, not just entry permission
  // (section: "view past financial records" — exports are historical data).
  const canFinance = ctx?.permissions.hasFinanceHistoryPermission() ?? false;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Reports & downloads</h1>
        <p className="text-sm text-muted">
          Every export respects your current permissions and includes the generation timestamp
          (section 5.4 / 8.2).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance dataset</CardTitle>
          <CardDescription>Programme-level attendance and calculated totals.</CardDescription>
        </CardHeader>
        <div className="flex gap-2">
          <a href="/reports/attendance">
            <Button variant="outline">Download CSV</Button>
          </a>
          <a href="/reports/attendance?format=xlsx">
            <Button variant="outline">Download Excel</Button>
          </a>
        </div>
      </Card>

      {canFinance && (
        <Card>
          <CardHeader>
            <CardTitle>Finance dataset</CardTitle>
            <CardDescription>Category and channel amounts, totals and notes. Finance-authorized users only.</CardDescription>
          </CardHeader>
          <div className="flex gap-2">
            <a href="/reports/finance">
              <Button variant="outline">Download CSV</Button>
            </a>
            <a href="/reports/finance?format=xlsx">
              <Button variant="outline">Download Excel</Button>
            </a>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Programme report</CardTitle>
          <CardDescription>Open any programme and use &ldquo;View printable programme report&rdquo; for a print/PDF-ready page with sign-offs.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
