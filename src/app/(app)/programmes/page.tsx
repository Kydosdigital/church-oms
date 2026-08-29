import Link from "next/link";
import { listProgrammes } from "@/lib/data/programmes";
import { StateBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatChurchDate } from "@/lib/locales";

export default async function ProgrammesPage(props: PageProps<"/programmes">) {
  const searchParams = await props.searchParams;
  const rawReview = Array.isArray(searchParams.review) ? searchParams.review[0] : searchParams.review;
  const review = rawReview === "attendance" || rawReview === "finance" ? rawReview : undefined;

  const ctx = await getCurrentUserContext();
  const supabase = await createClient();
  const { data: church } = ctx?.user.church_id
    ? await supabase
        .from("churches")
        .select("locale_code")
        .eq("id", ctx.user.church_id)
        .single()
    : { data: null };
  const localeCode = church?.locale_code ?? "en-GB";

  const programmes = await listProgrammes(
    undefined,
    review === "attendance"
      ? { attendanceState: "submitted" }
      : review === "finance"
        ? { financeState: "submitted" }
        : {}
  );

  const reviewTitle =
    review === "attendance"
      ? "Attendance awaiting verification"
      : review === "finance"
        ? "Finance awaiting verification"
        : null;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Programmes</h1>
          <p className="text-sm text-muted">
            {reviewTitle ?? "Service records for your assigned branches."}
          </p>
        </div>
        <Link href="/programmes/new">
          <Button>New programme</Button>
        </Link>
      </div>

      {review && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-brand border border-brand/20 bg-brand-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{reviewTitle}</p>
            <p className="text-xs text-muted">
              Open a record below to review its details and complete the appropriate verification.
            </p>
          </div>
          <Link href="/programmes" className="text-sm font-medium text-brand hover:underline">
            Show all programmes
          </Link>
        </div>
      )}

      <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {programmes.length === 0 && (
          <p className="p-6 text-sm text-muted">
            {review
              ? "Nothing is waiting for this review right now."
              : "No programmes yet — create your first service record."}
          </p>
        )}
        {programmes.map((programme) => (
          <Link
            key={programme.id}
            href={`/programmes/${programme.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-surface"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{programme.programme_name}</p>
              <p className="text-sm text-muted">
                {formatChurchDate(programme.programme_date, localeCode)} ·{" "}
                {programme.classification === "routine" ? "Routine" : "Special event"}
                {programme.attendance_records?.[0]?.total_attendance != null &&
                  ` · ${programme.attendance_records[0].total_attendance.toLocaleString(localeCode)} attended`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {review === "finance" && (
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Finance</p>
              )}
              <StateBadge state={review === "finance" ? programme.finance_state : programme.state} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
