import {
  getChurchSettings,
  listAuditEvents,
  listAuditEntityTables,
} from "@/lib/data/admin";
import { Card } from "@/components/ui/card";
import { formatChurchDateTime } from "@/lib/locales";

function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const ACTIONS = [
  "create",
  "update",
  "submit",
  "return",
  "verify",
  "reopen",
  "export",
  "admin_config",
  "counter_open",
  "counter_reopen",
  "counter_close",
  "counter_submit",
  "counter_resume",
  "counter_station_claim",
];

export default async function AuditLogPage(props: PageProps<"/admin/audit">) {
  const searchParams = await props.searchParams;
  const entityTable = param(searchParams.entity);
  const action = param(searchParams.action);
  const from = param(searchParams.from);
  const to = param(searchParams.to);

  const [events, entityTables, church] = await Promise.all([
    listAuditEvents({ entityTable, action, from, to: to ? `${to}T23:59:59` : undefined }),
    listAuditEntityTables(),
    getChurchSettings(),
  ]);
  const localeCode = church?.locale_code ?? "en-GB";
  const timeZone = church?.timezone ?? "UTC";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted">
          Every create/edit/verify/reopen is recorded here (section 7.2) — administrators only, and
          the log itself can never be edited or deleted, even by an administrator.
        </p>
      </div>

      <form className="flex flex-wrap gap-3 items-end" method="get">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="entity">Table</label>
          <select
            id="entity"
            name="entity"
            defaultValue={entityTable ?? ""}
            className="rounded-brand border border-surface-border bg-background h-10 px-3 text-sm"
          >
            <option value="">All</option>
            {entityTables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="action">Action</label>
          <select
            id="action"
            name="action"
            defaultValue={action ?? ""}
            className="rounded-brand border border-surface-border bg-background h-10 px-3 text-sm"
          >
            <option value="">All</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="from">From</label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-brand border border-surface-border bg-background h-10 px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="to">To</label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-brand border border-surface-border bg-background h-10 px-3 text-sm"
          />
        </div>
        <button type="submit" className="h-10 px-4 rounded-brand bg-brand text-brand-foreground text-sm font-medium">
          Filter
        </button>
      </form>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-border/30 text-left">
            <tr>
              <th className="p-3 font-medium">When</th>
              <th className="p-3 font-medium">Actor</th>
              <th className="p-3 font-medium">Table</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Entity ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="p-3 whitespace-nowrap">
                  {formatChurchDateTime(e.created_at, localeCode, timeZone)}
                </td>
                <td className="p-3">{e.app_users?.full_name ?? "System"}</td>
                <td className="p-3">{e.entity_table}</td>
                <td className="p-3">{e.action}</td>
                <td className="p-3 font-mono text-xs text-muted">{e.entity_id}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td className="p-4 text-muted" colSpan={5}>
                  No audit events match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted">Showing the most recent 200 matching events.</p>
    </div>
  );
}
