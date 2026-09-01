import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createProgrammeReportPdf } from "@/lib/pdf/programme-report";

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

  it("keeps the download route behind explicit report access checks", () => {
    expect(route).toContain("getCurrentUserContext()");
    expect(route).toContain("canAccessReports(ctx)");
    expect(route).toContain('status: 401');
    expect(route).toContain('status: 403');
    expect(route).toContain("getProgramme(id)");
    expect(route).toContain('"Content-Type": "application/pdf"');
    expect(route).toContain('"Cache-Control": "private, no-store"');
  });

  it("exposes a direct PDF download from the programme report page", () => {
    expect(page).toContain("Download PDF");
    expect(page).toContain("/pdf");
    expect(page).toContain("data-print-trigger");
  });
});
