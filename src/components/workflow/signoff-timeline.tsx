import type { Signoff } from "@/types/domain";

export type SignoffTimelineItem = Signoff & {
  actor_name: string | null;
};

const ACTION_LABELS: Record<Signoff["action"], string> = {
  submit: "Submitted",
  verify: "Verified",
  return: "Returned for correction",
  reopen: "Reopened",
};

function formatSignoffTime(value: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString();
  }
}

export function SignoffTimeline({
  signoffs,
  timeZone,
  emptyMessage = "No digital sign-off has been recorded yet.",
}: {
  signoffs: SignoffTimelineItem[];
  timeZone: string;
  emptyMessage?: string;
}) {
  if (signoffs.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-3">
      {signoffs.map((signoff) => (
        <li
          key={signoff.id}
          className="rounded-brand border border-surface-border bg-background px-3 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{ACTION_LABELS[signoff.action]}</p>
              <p className="text-sm text-muted">
                by <span className="font-medium text-foreground">{signoff.actor_name ?? "Unknown user"}</span>
              </p>
            </div>
            <span className="rounded-full bg-brand-muted px-2 py-1 text-xs font-medium text-brand">
              Version {signoff.record_version}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatSignoffTime(signoff.created_at, timeZone)}
          </p>
          {signoff.reason && (
            <p className="mt-2 text-sm">
              <span className="text-muted">Reason:</span> {signoff.reason}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
