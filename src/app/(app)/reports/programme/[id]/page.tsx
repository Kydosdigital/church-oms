import { notFound } from "next/navigation";
import { getProgramme } from "@/lib/data/programmes";
import { createClient } from "@/lib/supabase/server";
import type { Signoff } from "@/types/domain";

export default async function ProgrammeReportPage(props: PageProps<"/reports/programme/[id]">) {
  const { id } = await props.params;
  const result = await getProgramme(id);
  if (!result) notFound();
  const { programme, attendance } = result;

  const supabase = await createClient();
  const { data: signoffsData } = await supabase
    .from("signoffs")
    .select("*, app_users(full_name)")
    .eq("programme_id", id)
    .order("created_at");
  const signoffs = (signoffsData ?? []) as (Signoff & { app_users: { full_name: string } | null })[];

  const submit = signoffs.find((s) => s.action === "submit" && s.record_kind === "attendance");
  const verify = signoffs.find((s) => s.action === "verify" && s.record_kind === "attendance");

  const generatedAt = new Date().toLocaleString();

  return (
    <div className="p-8 max-w-2xl mx-auto print:p-0 bg-background text-foreground">
      <div className="flex justify-end mb-4 print:hidden">
        <button
          className="rounded-brand bg-brand text-brand-foreground px-4 py-2 text-sm"
          data-print-trigger
        >
          Print / Save as PDF
        </button>
      </div>

      <h1 className="text-xl font-semibold">{programme.programme_name}</h1>
      <p className="text-sm text-muted">{programme.programme_date}</p>

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
          {submit ? ` on ${new Date(submit.created_at).toLocaleString()}` : ""}
        </p>
        <p className="text-sm">
          Verified by <strong>{verify?.app_users?.full_name ?? "Not yet verified"}</strong>
          {verify ? ` on ${new Date(verify.created_at).toLocaleString()}` : ""}
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
