import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformDashboardData } from "@/lib/data/platform";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformGrowthChart } from "@/components/platform/platform-growth-chart";

export const metadata = {
  title: "Platform Owner",
  robots: { index: false, follow: false },
};

export default async function PlatformDashboardPage() {
  const data = await getPlatformDashboardData();
  if (!data) redirect("/dashboard");

  const { totals } = data;
  const activeChurchPercent =
    totals.churches > 0
      ? Math.round((totals.activeChurches30Days / totals.churches) * 100)
      : 0;

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <header className="border-b border-surface-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/church-oms-icon-primary-transparent.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="font-semibold">Church OMS</p>
              <p className="text-xs text-muted">
                Platform Owner · {formatPlatformRole(data.platformRole)}
              </p>
            </div>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
            Back to my church
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <p className="text-sm font-medium text-brand">Platform analytics</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Church OMS overview</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Cross-platform growth, account setup and church activity. Platform access is separate
            from church-level Super Admin permissions.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Metric
            label="Registered churches"
            value={totals.churches}
            note={totals.churchesLast7Days + " created in the last 7 days"}
          />
          <Metric
            label="User accounts"
            value={totals.users}
            note={totals.activeUsers + " active"}
          />
          <Metric
            label="Awaiting setup"
            value={totals.awaitingChurchSetup}
            note="Signed up, no church created or joined yet"
          />
          <Metric
            label="Active churches"
            value={totals.activeChurches30Days}
            note={activeChurchPercent + "% recorded a programme in the last 30 days"}
          />
          <Metric
            label="Programmes recorded"
            value={totals.programmes}
            note={totals.branches + " active branches across the platform"}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Platform growth, last 30 days</CardTitle>
            <CardDescription>
              New accounts, new churches and programme activity by day. This is calculated in
              PostgreSQL, rather than by downloading every tenant record into the app.
            </CardDescription>
          </CardHeader>
          <PlatformGrowthChart data={data.growth} />
        </Card>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Churches</h2>
              <p className="text-sm text-muted">
                Latest registered organisations, with account and usage signals.
              </p>
            </div>
            <p className="text-xs text-muted">Showing up to the 50 most recent churches</p>
          </div>

          <div className="overflow-hidden rounded-brand border border-surface-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-sm">
                <thead className="bg-surface-border/30 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Church</th>
                    <th className="px-4 py-3 font-medium">Super Admin</th>
                    <th className="px-4 py-3 font-medium">Users</th>
                    <th className="px-4 py-3 font-medium">Branches</th>
                    <th className="px-4 py-3 font-medium">Programmes</th>
                    <th className="px-4 py-3 font-medium">Latest activity</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {data.churches.map((church) => (
                    <tr key={church.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium">{church.name}</p>
                        <p className="text-xs text-muted">
                          {church.currency_code} · {church.timezone}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {church.super_admins.length > 0 ? (
                          church.super_admins.map((admin) => (
                            <div key={admin.email} className="mb-1 last:mb-0">
                              <p>{admin.full_name}</p>
                              <p className="text-xs text-muted">{admin.email}</p>
                            </div>
                          ))
                        ) : (
                          <span className="text-warning">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {church.active_user_count}/{church.user_count} active
                      </td>
                      <td className="px-4 py-3 align-top">{church.branch_count}</td>
                      <td className="px-4 py-3 align-top">{church.programme_count}</td>
                      <td className="px-4 py-3 align-top text-muted">
                        {church.latest_programme_at
                          ? formatDateTime(church.latest_programme_at)
                          : "No programme yet"}
                      </td>
                      <td className="px-4 py-3 align-top text-muted">
                        {formatDate(church.created_at)}
                      </td>
                    </tr>
                  ))}
                  {data.churches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted">
                        No churches registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Recent accounts</h2>
              <p className="text-sm text-muted">
                New people creating or joining Church OMS accounts.
              </p>
            </div>
            <p className="text-xs text-muted">Showing the 25 newest accounts</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {data.recentAccounts.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">{account.full_name}</p>
                    <p className="break-all text-sm text-muted">{account.email}</p>
                    <p className="mt-2 text-xs text-muted">
                      {account.church_name ?? "Awaiting church setup"} ·{" "}
                      {formatDateTime(account.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!account.church_id && (
                      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                        Awaiting setup
                      </span>
                    )}
                    <span
                      className={
                        account.active
                          ? "rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
                          : "rounded-full bg-surface-border px-2.5 py-1 text-xs font-medium text-muted"
                      }
                    >
                      {account.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}

            {data.recentAccounts.length === 0 && (
              <Card className="p-6 text-sm text-muted">No accounts have been created yet.</Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <Card>
      <CardHeader className="mb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
      </CardHeader>
      <p className="text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </Card>
  );
}

function formatPlatformRole(role: "owner" | "admin" | "support") {
  if (role === "owner") return "Owner access";
  if (role === "admin") return "Platform admin";
  return "Platform support";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
