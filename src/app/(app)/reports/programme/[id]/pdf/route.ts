import "server-only";

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { getProgramme } from "@/lib/data/programmes";
import {
  formatChurchDate,
  formatChurchDateTime,
} from "@/lib/locales";
import { createProgrammeReportPdf } from "@/lib/pdf/programme-report";
import {
  selectCurrentAttendanceSignoffs,
  type ProgrammeReportSignoff,
} from "@/lib/reports/programme-signoffs";

export const runtime = "nodejs";

function filenamePart(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return cleaned.slice(0, 60) || "programme";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentUserContext();

  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!ctx.user.active || !ctx.user.church_id) {
    return new Response("Active church account required", { status: 403 });
  }

  const { id } = await context.params;
  const result = await getProgramme(id);

  if (!result) {
    return new Response("Programme not found", { status: 404 });
  }

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
  const generatedAtIso = new Date().toISOString();

  const pdf = createProgrammeReportPdf({
    title: programme.programme_name,
    date: formatChurchDate(programme.programme_date, localeCode),
    attendance: {
      men: attendance.men_count,
      women: attendance.women_count,
      teenagers: attendance.teenagers_count,
      children: attendance.children_count,
      total: attendance.total_attendance,
      venueCapacity: programme.venue_capacity_snapshot,
    },
    outcomes: {
      firstTimers: attendance.first_timers_count,
      converts: attendance.converts_count,
      newBirths: attendance.new_births_count,
      weddings: attendance.weddings_count,
    },
    notes: programme.notes,
    submittedBy: submit?.app_users?.full_name ?? "Not yet submitted",
    submittedAt: submit
      ? formatChurchDateTime(
          submit.created_at,
          localeCode,
          timeZone
        )
      : null,
    verifiedBy: verify?.app_users?.full_name ?? "Not yet verified",
    verifiedAt: verify
      ? formatChurchDateTime(
          verify.created_at,
          localeCode,
          timeZone
        )
      : null,
    generatedAt: formatChurchDateTime(
      generatedAtIso,
      localeCode,
      timeZone
    ),
  });

  const filename = `${filenamePart(programme.programme_name)}-${programme.programme_date}.pdf`;

  const body = new Uint8Array(pdf);

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
