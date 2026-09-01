import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserContext } from "@/lib/data/current-user";
import {
  getOnlineGivingReconciliationData,
  listReconciliationBranches,
  type ReconciliationStatus,
} from "@/lib/data/online-giving";
import { OnlineGivingImport } from "@/components/revenue/online-giving-import";
import { OnlineGivingTransactionRow } from "@/components/revenue/online-giving-transaction-row";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonClassName } from "@/components/ui/button";
import { formatCurrency } from "@/lib/calculations";
import { formatChurchDate, formatChurchDateTime } from "@/lib/locales";

const STATUS_OPTIONS: { value: ReconciliationStatus; label: string }[] = [
  { value: "unmatched", label: "Unmatched" },
  { value: "matched", label: "Matched" },
  { value: "ignored", label: "Ignored" },
  { value: "all", label: "All" },
];

export default async function OnlineGivingReconciliationPage(
  props: PageProps<"/revenue/reconciliation">
) {
  const searchParams = await props.searchParams;
  const ctx = await getCurrentUserContext();

  if (!ctx?.user.active || !ctx.user.church_id) {
    redirect("/login");
  }

  const branches = await listReconciliationBranches();
  if (branches.length === 0) {
    return (
      <div className="max-w-3xl space-y-4 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold">Online giving reconciliation</h1>
          <p className="text-sm text-muted">
            This area requires finance-history permission for at least one branch.
          </p>
        </div>
        <Link href="/revenue" className={buttonClassName({ variant: "outline" })}>
          Back to Revenue
        </Link>
      </div>
    );
  }

  const requestedBranch = Array.isArray(searchParams.branch)
    ? searchParams.branch[0]
    : searchParams.branch;
  const selectedBranch =
    branches.find((branch) => branch.id === requestedBranch) ?? branches[0];

  if (!ctx.permissions.hasFinanceHistoryPermission(selectedBranch.id)) {
    redirect("/revenue");
  }

  const rawStatus = Array.isArray(searchParams.status)
    ? searchParams.status[0]
    : searchParams.status;
  const status: ReconciliationStatus = STATUS_OPTIONS.some(
    (option) => option.value === rawStatus
  )
    ? (rawStatus as ReconciliationStatus)
    : "unmatched";

  const rawPage = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;
  const parsedPage = Number(rawPage);
  const page =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const supabase = await createClient();
  const [{ data: church }, data] = await Promise.all([
    supabase
      .from("churches")
      .select("currency_code, locale_code, timezone")
      .eq("id", ctx.user.church_id)
      .single(),
    getOnlineGivingReconciliationData(selectedBranch.id, status, page),
  ]);

  if (page > data.pagination.totalPages) {
    redirect(
      `/revenue/reconciliation?branch=${selectedBranch.id}&status=${status}&page=${data.pagination.totalPages}`
    );
  }

  const currencyCode = church?.currency_code ?? "GBP";
  const localeCode = church?.locale_code ?? "en-GB";
  const timeZone = church?.timezone ?? "UTC";

  const reconciledServices = data.summary.filter(
    (row) =>
      Math.abs(row.variance) < 0.005 &&
      (row.recorded_online > 0 || row.matched_imported > 0)
  ).length;
  const servicesWithVariance = data.summary.filter(
    (row) => Math.abs(row.variance) >= 0.005
  ).length;

  return (
    <div className="max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">Revenue</p>
          <h1 className="text-2xl font-semibold">Online giving reconciliation</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Import a bank or payment-provider CSV, match transactions to services,
            and compare the imported total with the online giving recorded in Church OMS.
          </p>
        </div>
        <Link href="/revenue" className={buttonClassName({ variant: "outline" })}>
          Back to Revenue
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch</CardTitle>
          <CardDescription>
            Reconciliation is branch-scoped and only branches where you have finance-history
            permission are available.
          </CardDescription>
        </CardHeader>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label htmlFor="branch" className="mb-1 block text-sm font-medium">
              Reconcile branch
            </label>
            <select
              id="branch"
              name="branch"
              defaultValue={selectedBranch.id}
              className="block h-11 w-full rounded-brand border border-surface-border bg-background px-3"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="status" value={status} />
          <Button type="submit">View branch</Button>
        </form>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Imported statements" value={data.counts.batches} />
        <Metric label="Unmatched transactions" value={data.counts.unmatched} />
        <Metric label="Matched transactions" value={data.counts.matched} />
        <Metric label="Ignored transactions" value={data.counts.ignored} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Metric
          label="Services reconciled"
          value={reconciledServices}
          note="Recorded online giving equals matched imported giving"
        />
        <Metric
          label="Services with variance"
          value={servicesWithVariance}
          note="Needs review before you can consider the service reconciled"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Import online giving</CardTitle>
          <CardDescription>
            The normalized statement contents are fingerprinted on the server, so
            re-importing the same transactions is blocked. Donor names are not imported
            as a dedicated field; statement references are retained for reconciliation.
          </CardDescription>
        </CardHeader>
        <OnlineGivingImport
          branchId={selectedBranch.id}
          branchName={selectedBranch.name}
          currencyCode={currencyCode}
          localeCode={localeCode}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service reconciliation</CardTitle>
          <CardDescription>
            Variance = matched imported transactions minus the online giving recorded for
            that service. Zero means the two sources agree.
          </CardDescription>
        </CardHeader>

        {data.summary.length === 0 ? (
          <p className="text-sm text-muted">
            No online giving has been recorded or matched for this branch yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium">Finance state</th>
                  <th className="pb-2 text-right font-medium">Recorded online</th>
                  <th className="pb-2 text-right font-medium">Imported matched</th>
                  <th className="pb-2 text-right font-medium">Variance</th>
                  <th className="pb-2 text-right font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.summary.map((row) => {
                  const reconciled = Math.abs(row.variance) < 0.005;
                  return (
                    <tr key={row.programme_id}>
                      <td className="py-3">
                        <p className="font-medium">{row.programme_name}</p>
                        <p className="text-xs text-muted">
                          {formatChurchDate(row.programme_date, localeCode)}
                        </p>
                      </td>
                      <td className="py-3 capitalize">{row.finance_state}</td>
                      <td className="py-3 text-right">
                        {formatCurrency(row.recorded_online, currencyCode, localeCode)}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(row.matched_imported, currencyCode, localeCode)}
                      </td>
                      <td
                        className={
                          reconciled
                            ? "py-3 text-right font-medium text-success"
                            : "py-3 text-right font-medium text-warning"
                        }
                      >
                        {formatCurrency(row.variance, currencyCode, localeCode)}
                      </td>
                      <td className="py-3 text-right">
                        {row.matched_transaction_count.toLocaleString(localeCode)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Work through unmatched items first. Transactions are shown 100 at a time so
            older items remain reachable; service totals above use all matched data.
          </CardDescription>
        </CardHeader>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={`/revenue/reconciliation?branch=${selectedBranch.id}&status=${option.value}`}
              className={
                option.value === status
                  ? "rounded-brand bg-brand px-3 py-2 text-sm font-medium text-brand-foreground"
                  : "rounded-brand border border-surface-border px-3 py-2 text-sm font-medium hover:bg-surface"
              }
            >
              {option.label}
              {option.value !== "all" && (
                <span className="ml-1 text-xs opacity-80">
                  (
                  {data.counts[
                    option.value as "unmatched" | "matched" | "ignored"
                  ].toLocaleString(localeCode)}
                  )
                </span>
              )}
            </Link>
          ))}
        </div>

        {data.transactions.length === 0 ? (
          <p className="text-sm text-muted">
            No {status === "all" ? "" : status + " "}transactions in this branch.
          </p>
        ) : (
          <>
            <div className="-mx-4 border-t border-surface-border sm:-mx-0 sm:rounded-brand sm:border">
              {data.transactions.map((transaction) => (
                <OnlineGivingTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  programmes={data.programmes}
                  categories={data.categories}
                  currencyCode={currencyCode}
                  localeCode={localeCode}
                />
              ))}
            </div>

            {data.pagination.totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Page {data.pagination.page.toLocaleString(localeCode)} of{" "}
                  {data.pagination.totalPages.toLocaleString(localeCode)} · showing{" "}
                  {(
                    (data.pagination.page - 1) * data.pagination.pageSize +
                    1
                  ).toLocaleString(localeCode)}
                  –
                  {Math.min(
                    data.pagination.page * data.pagination.pageSize,
                    data.pagination.total
                  ).toLocaleString(localeCode)}{" "}
                  of {data.pagination.total.toLocaleString(localeCode)}
                </p>
                <div className="flex gap-2">
                  {data.pagination.page > 1 && (
                    <Link
                      href={`/revenue/reconciliation?branch=${selectedBranch.id}&status=${status}&page=${data.pagination.page - 1}`}
                      className={buttonClassName({ variant: "outline", size: "sm" })}
                    >
                      Previous
                    </Link>
                  )}
                  {data.pagination.page < data.pagination.totalPages && (
                    <Link
                      href={`/revenue/reconciliation?branch=${selectedBranch.id}&status=${status}&page=${data.pagination.page + 1}`}
                      className={buttonClassName({ variant: "outline", size: "sm" })}
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {data.batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent statement imports</CardTitle>
            <CardDescription>
              Latest imports for {selectedBranch.name}. File fingerprints prevent exact
              duplicate imports.
            </CardDescription>
          </CardHeader>
          <div className="divide-y divide-surface-border">
            {data.batches.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{batch.source_name}</p>
                  <p className="text-xs text-muted">
                    {batch.file_name ?? "Imported statement"} ·{" "}
                    {formatChurchDateTime(batch.created_at, localeCode, timeZone)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">
                    {formatCurrency(batch.total_amount, currencyCode, localeCode)}
                  </p>
                  <p className="text-xs text-muted">
                    {batch.row_count.toLocaleString(localeCode)} transactions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value.toLocaleString()}</p>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </Card>
  );
}
