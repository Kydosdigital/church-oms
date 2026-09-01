import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createProgrammeReportPdf } from "@/lib/pdf/programme-report";
import {
  selectCurrentAttendanceSignoffs,
  type ProgrammeReportSignoff,
} from "@/lib/reports/programme-signoffs";

const route = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(app)/reports/programme/[id]/pdf/route.ts"
  ),
  "utf8"
);
const page = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(app)/reports/programme/[id]/page.tsx"
  ),
  "utf8"
);

const baseReport = {
  title: "Sunday Service (AM) — Café",
  date: "01 Sep 2026",
  attendance: {
    men: 40,
    women: 55,
    teenagers: 12,
    children: 18,
    total: 125,
    venueCapacity: 200,
  },
  outcomes: {
    firstTimers: 5,
    converts: 2,
    newBirths: 1,
    weddings: 0,
  },
  notes: "A normal service with notes.",
  submittedBy: "Usher One",
  submittedAt: "01 Sep 2026, 12:00 BST",
  verifiedBy: "Verifier One",
  verifiedAt: "01 Sep 2026, 13:00 BST",
  generatedAt: "01 Sep 2026, 21:00 BST",
};

function signoff(
  action: ProgrammeReportSignoff["action"],
  recordVersion: number,
  name: string
): ProgrammeReportSignoff {
  return {
    id: `${action}-${recordVersion}`,
    programme_id: "programme-1",
    record_kind: "attendance",
    action,
    actor_id: `actor-${recordVersion}`,
    record_version: recordVersion,
    reason: null,
    created_at: `2026-09-01T${String(recordVersion).padStart(2, "0")}:00:00Z`,
    app_users: { full_name: name },
  };
}

describe("programme report PDF", () => {
  it("generates a real PDF document with a valid xref/trailer", () => {
    const pdf = createProgrammeReportPdf(baseReport);
    const raw = Buffer.from(pdf).toString("latin1");

    expect(raw.startsWith("%PDF-1.4")).toBe(true);
    expect(raw).toContain("xref\n");
    expect(raw).toContain("trailer\n");
    expect(raw).toContain("%%EOF");
    expect(raw).toContain("/Type /Catalog");
    expect(raw).toContain("/BaseFont /Helvetica");
  });

  it("escapes PDF syntax and normalizes unsupported punctuation safely", () => {
    const raw = Buffer.from(createProgrammeReportPdf(baseReport)).toString(
      "latin1"
    );

    expect(raw).toContain("(Sunday Service \\(AM\\) - Cafe)");
  });

  it("preserves readable spacing in multiline notes", () => {
    const raw = Buffer.from(
      createProgrammeReportPdf({
        ...baseReport,
        notes: "First paragraph\nSecond paragraph\tthird line",
      })
    ).toString("latin1");

    expect(raw).toContain("(First paragraph Second paragraph third line)");
    expect(raw).not.toContain("paragraph?Second");
  });

  it("wraps long programme titles instead of clipping them", () => {
    const raw = Buffer.from(
      createProgrammeReportPdf({
        ...baseReport,
        title:
          "Annual Convention Celebration Service With Regional Leaders Families Guests And Community Partners",
      })
    ).toString("latin1");

    expect((raw.match(/\/F2 18 Tf/g) ?? []).length).toBeGreaterThan(1);
  });

  it("adds pages when long notes exceed the first page", () => {
    const pdf = createProgrammeReportPdf({
      ...baseReport,
      notes: Array.from(
        { length: 180 },
        (_, index) => `Detailed pastoral note ${index + 1}.`
      ).join(" "),
    });
    const raw = Buffer.from(pdf).toString("latin1");
    const pageObjects = raw.match(/\/Type \/Page \/Parent/g) ?? [];

    expect(pageObjects.length).toBeGreaterThan(1);
  });

  it("keeps PDF access aligned with the printable RLS-backed report", () => {
    expect(route).toContain("getCurrentUserContext()");
    expect(route).toContain("ctx.user.active");
    expect(route).toContain("ctx.user.church_id");
    expect(route).not.toContain("canAccessReports(ctx)");
    expect(route).toContain('status: 401');
    expect(route).toContain('status: 403');
    expect(route).toContain("getProgramme(id)");
    expect(route).toContain('"Content-Type": "application/pdf"');
    expect(route).toContain('"Cache-Control": "private, no-store"');
  });

  it("uses only sign-offs from the current reopened workflow cycle", () => {
    const signoffs = [
      signoff("submit", 1, "Old Usher"),
      signoff("verify", 2, "Old Verifier"),
      signoff("reopen", 3, "Administrator"),
      signoff("submit", 5, "Current Usher"),
      signoff("verify", 6, "Current Verifier"),
    ];

    const result = selectCurrentAttendanceSignoffs(signoffs, "verified");

    expect(result.submit?.app_users?.full_name).toBe("Current Usher");
    expect(result.verify?.app_users?.full_name).toBe("Current Verifier");
  });

  it("does not reuse a previous-cycle submitter while a record is reopened", () => {
    const result = selectCurrentAttendanceSignoffs(
      [
        signoff("submit", 1, "Old Usher"),
        signoff("verify", 2, "Old Verifier"),
        signoff("reopen", 3, "Administrator"),
      ],
      "reopened"
    );

    expect(result.submit).toBeUndefined();
    expect(result.verify).toBeUndefined();
  });

  it("does not show a historical verifier for a current returned cycle", () => {
    const result = selectCurrentAttendanceSignoffs(
      [
        signoff("submit", 1, "Old Usher"),
        signoff("verify", 2, "Old Verifier"),
        signoff("reopen", 3, "Administrator"),
        signoff("submit", 5, "Current Usher"),
        signoff("return", 6, "Current Verifier"),
      ],
      "returned"
    );

    expect(result.submit?.app_users?.full_name).toBe("Current Usher");
    expect(result.verify).toBeUndefined();
  });

  it("exposes a direct PDF download from the programme report page", () => {
    expect(page).toContain("Download PDF");
    expect(page).toContain("/pdf");
    expect(page).toContain("data-print-trigger");
    expect(page).toContain("selectCurrentAttendanceSignoffs");
  });
});
