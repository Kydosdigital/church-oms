import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramme } from "@/lib/data/programmes";
import { createClient } from "@/lib/supabase/server";
import { formatChurchDate, formatChurchDateTime } from "@/lib/locales";
import { buttonClassName } from "@/components/ui/button";
import {
  selectCurrentAttendanceSignoffs,
  type ProgrammeReportSignoff,
} from "@/lib/reports/programme-signoffs";

export default async function ProgrammeReportPage(props: PageProps<"/reports/programme/[id]">) {
  const { id } = await props.params;
  const result = await getProgramme(id);
  if (!result) notFound();
  const { programme, attendance } = result;

  const supabase = await createClient();
  const [{ data: signoffsData }, { data: church }] = await Promise.all([
    supabase
      .from("signoffs")
      .select("*, app_users(full_name)")
      .eq("programme_id", id)
      .order("record_version", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("churches")
      .select("timezone, locale_code")
      .eq("id", programme.church_id)
      .single(),
  ]);
  const signoffs = (signoffsData ?? []) as ProgrammeReportSignoff[];
  const { submit, verify } = selectCurrentAttendanceSignoffs(
    signoffs,
    programme.state
  );

  const localeCode = church?.locale_code ?? "en-GB";
  const timeZone = church?.timezone ?? "UTC";
  const generatedAt = formatChurchDateTime(
    new Date().toISOString(),
    localeCode,
    timeZone
  );

  return (
    <div className="p-8 max-w-2xl mx-auto print:p-0 bg-background text-foreground">
      <div className="flex flex-wrap justify-end gap-2 mb-4 print:hidden">
        <Link
          href={`/reports/programme/${id}/pdf`}
          className={buttonClassName({ size: "sm" })}
        >
          Download PDF
        </Link>
        <button
          className={buttonClassName({ variant: "outline", size: "sm" })}
          data-print-trigger
        >
          Print
        </button>
      </div>

      <h1 className="text-xl font-semibold">{programme.programme_name}</h1>
      <p className="text-sm text-muted">
        {formatChurchDate(programme.programme_date, localeCode)}
      </p>

      <section className="mt-6">
        <h2 className="font-semibold mb-2">Attendance</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <Row label="Men" value={attendance.men_count} />
            <Row label="Women" value={attendance.women_count} />
            <Row label="Teenagers" value={attendance.teenagers_count} />
            <Row label="Children" value={attendance.children_count} />
            <Row label="Total attendance" value={attendance.total_attendance} bold />
            <Row label="Venue capacity" value={programme.venue_capacity_snapshot} />
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold mb-2">Outcomes</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <Row label="First-timers" value={attendance.first_timers_count} />
            <Row label="Converts" value={attendance.converts_count} />
            <Row label="New births" value={attendance.new_births_count} />
            <Row label="Weddings" value={attendance.weddings_count} />
          </tbody>
        </table>
      </section>

      {programme.notes && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Notes</h2>
          <p className="text-sm">{programme.notes}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold mb-2">Sign-offs</h2>
        <p className="text-sm">
          Submitted by <strong>{submit?.app_users?.full_name ?? "—"}</strong>
          {submit
            ? " on " + formatChurchDateTime(submit.created_at, localeCode, timeZone)
            : ""}
        </p>
        <p className="text-sm">
          Verified by <strong>{verify?.app_users?.full_name ?? "Not yet verified"}</strong>
          {verify
            ? " on " + formatChurchDateTime(verify.created_at, localeCode, timeZone)
            : ""}
        </p>
      </section>

      <p className="text-xs text-muted mt-8">Report generated {generatedAt}</p>

      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('[data-print-trigger]')?.addEventListener('click', () => window.print());`,
        }}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr className="border-b border-surface-border">
      <td className="py-1 text-muted">{label}</td>
      <td className={`py-1 text-right ${bold ? "font-semibold" : ""}`}>{value}</td>
    </tr>
  );
}
