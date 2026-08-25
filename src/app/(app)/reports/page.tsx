import { getCurrentUserContext } from "@/lib/data/current-user";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ReportsPage() {
  const ctx = await getCurrentUserContext();
  const canFinance = ctx?.permissions.hasFinancePermission() ?? false;

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
          <CardDescription>Filtered programme-level attendance and calculated totals (CSV).</CardDescription>
        </CardHeader>
        <a href="/reports/attendance">
          <Button variant="outline">Download CSV</Button>
        </a>
      </Card>

      {canFinance && (
        <Card>
          <CardHeader>
            <CardTitle>Finance dataset</CardTitle>
            <CardDescription>Filtered category and channel amounts, totals and notes (CSV). Finance-authorized users only.</CardDescription>
          </CardHeader>
          <a href="/reports/finance">
            <Button variant="outline">Download CSV</Button>
          </a>
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
