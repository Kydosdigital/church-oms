import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProgramme } from "@/lib/data/programmes";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { getLiveCounterForProgramme } from "@/lib/data/live-counter";
import { LiveCounter } from "@/components/attendance/live-counter";
import { createClient } from "@/lib/supabase/server";
import { formatChurchDate } from "@/lib/locales";

export default async function ProgrammeCounterPage(props: PageProps<"/programmes/[id]/counter">) {
  const { id } = await props.params;
  const [result, ctx, counter] = await Promise.all([
    getProgramme(id),
    getCurrentUserContext(),
    getLiveCounterForProgramme(id),
  ]);

  if (!result) notFound();
  if (!ctx) redirect("/login");

  const { programme, attendance } = result;
  const supabase = await createClient();
  const { data: church } = await supabase
    .from("churches")
    .select("locale_code")
    .eq("id", programme.church_id)
    .single();
  const localeCode = church?.locale_code ?? "en-GB";

  const isAdministrator = ctx.permissions.isAdministrator();
  const workflowEditable = ["draft", "returned", "reopened"].includes(programme.state);
  const hasUsherRole = ctx.permissions.hasRole("usher", programme.branch_id);
  const canVerify = ctx.permissions.canVerifyAttendance(programme.branch_id);
  const canReview = canVerify || ctx.permissions.hasRole("pastor") || isAdministrator;
  const canCount = workflowEditable && (hasUsherRole || isAdministrator);
  const canClose = workflowEditable && (canVerify || isAdministrator);
  const canOpen =
    workflowEditable && (hasUsherRole || canVerify || isAdministrator);

  if (!canCount && !canReview) {
    redirect(`/programmes/${id}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <Link href={`/programmes/${id}`} className="inline-flex text-sm font-medium text-brand hover:underline">
        ← Back to programme
      </Link>
      <LiveCounter
        programmeId={programme.id}
        programmeName={programme.programme_name}
        programmeDate={formatChurchDate(programme.programme_date, localeCode, {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
        currentUserId={ctx.user.id}
        currentUserName={ctx.user.full_name}
        recordedAttendanceTotal={attendance.total_attendance}
        initialSession={counter.session}
        initialEntries={counter.entries}
        canCount={canCount}
        canOpen={canOpen}
        canReview={canReview}
        canClose={canClose}
      />
    </div>
  );
}
