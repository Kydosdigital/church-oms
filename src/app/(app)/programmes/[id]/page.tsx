import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramme } from "@/lib/data/programmes";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { StateBadge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerificationActions } from "@/components/forms/verification-actions";
import { capacityUtilization, formatPercent } from "@/lib/calculations";
import { SignoffTimeline } from "@/components/workflow/signoff-timeline";
import type { Signoff } from "@/types/domain";

export default async function ProgrammeDetailPage(props: PageProps<"/programmes/[id]">) {
  const { id } = await props.params;
  const result = await getProgramme(id);
  if (!result) notFound();
  const { programme, attendance } = result;

  const ctx = await getCurrentUserContext();
  const supabase = await createClient();
  const [{ data: signoffsData }, { data: church }] = await Promise.all([
    supabase
      .from("signoffs")
      .select("*, app_users(full_name)")
      .eq("programme_id", id)
      .eq("record_kind", "attendance")
      .order("created_at"),
    supabase
      .from("churches")
      .select("timezone")
      .eq("id", programme.church_id)
      .single(),
  ]);

  const { data: preacher } = programme.preacher_id
    ? await supabase
        .from("ministers")
        .select("full_name, is_guest")
        .eq("id", programme.preacher_id)
        .maybeSingle()
    : { data: null };

  const signoffs = (
    (signoffsData ?? []) as (Signoff & { app_users: { full_name: string } | null })[]
  ).map((signoff) => ({
    ...signoff,
    actor_name: signoff.app_users?.full_name ?? null,
  }));

  const canVerify = ctx?.permissions.canVerifyAttendance(programme.branch_id) ?? false;
  const canReopen = ctx?.permissions.isAdministrator() ?? false;
  const canEnterFinance = ctx?.permissions.hasFinancePermission(programme.branch_id) ?? false;
  const canUseLiveCounter = Boolean(
    ctx && (
      ctx.permissions.hasRole("usher", programme.branch_id) ||
      ctx.permissions.hasRole("attendance_verifier", programme.branch_id) ||
      ctx.permissions.hasRole("pastor") ||
      ctx.permissions.isAdministrator()
    )
  );

  const utilization = capacityUtilization(attendance.total_attendance, programme.venue_capacity_snapshot);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{programme.programme_name}</h1>
          <p className="text-sm text-muted">{programme.programme_date}</p>
        </div>
        <StateBadge state={programme.state} />
      </div>

      {(preacher || programme.sermon_topic) && (
        <Card>
          <CardHeader>
            <CardTitle>Service details</CardTitle>
          </CardHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Preacher</dt>
              <dd className="font-medium">
                {preacher
                  ? `${preacher.full_name}${preacher.is_guest ? " (Guest)" : ""}`
                  : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Sermon topic</dt>
              <dd className="font-medium">{programme.sermon_topic || "Not recorded"}</dd>
            </div>
          </dl>
        </Card>
      )}

      {canUseLiveCounter && (
        <Card className="border-brand/30 bg-brand-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Live attendance counter</p>
              <p className="mt-1 text-sm text-muted">
                Let multiple ushers tap their own counters and combine every doorway into one live total.
              </p>
            </div>
            <Link href={`/programmes/${programme.id}/counter`}>
              <Button>Open live counter</Button>
            </Link>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="Men" value={attendance.men_count} />
          <Stat label="Women" value={attendance.women_count} />
          <Stat label="Teenagers" value={attendance.teenagers_count} />
          <Stat label="Children" value={attendance.children_count} />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-brand bg-brand-muted px-4 py-3">
          <span className="text-sm font-medium text-brand">Total attendance</span>
          <span className="text-2xl font-bold text-brand">{attendance.total_attendance}</span>
        </div>
        <p className="text-xs text-muted mt-2">
          Capacity utilization: {formatPercent(utilization)} of {programme.venue_capacity_snapshot}
        </p>
        {attendance.capacity_exception_note && (
          <p className="text-xs text-warning mt-1">Capacity note: {attendance.capacity_exception_note}</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outcomes</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="First-timers" value={attendance.first_timers_count} />
          <Stat label="Converts" value={attendance.converts_count} />
          <Stat label="New births" value={attendance.new_births_count} />
          <Stat label="Weddings" value={attendance.weddings_count} />
        </div>
        {attendance.outcome_exception_note && (
          <p className="text-xs text-warning mt-2">Outcome note: {attendance.outcome_exception_note}</p>
        )}
      </Card>

      {programme.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <p className="text-sm">{programme.notes}</p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Digital attendance sign-off</CardTitle>
          <CardDescription>
            No handwritten signature is needed. Church OMS records the authenticated user, church-local
            time and exact record version for every submission, verification, return and reopen action.
          </CardDescription>
        </CardHeader>
        <VerificationActions
          programmeId={programme.id}
          version={programme.version}
          state={programme.state}
          canVerify={canVerify}
          canReopen={canReopen}
        />
        <div className="mt-4">
          <SignoffTimeline
            signoffs={signoffs}
            timeZone={church?.timezone ?? "UTC"}
            emptyMessage="This attendance record has not been digitally signed yet."
          />
        </div>
      </Card>

      {canEnterFinance && (
        <Link href={`/revenue/${programme.id}`}>
          <Button variant="outline">Enter revenue for this programme</Button>
        </Link>
      )}

      <Link href={`/reports/programme/${programme.id}`}>
        <Button variant="ghost">View printable programme report</Button>
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
