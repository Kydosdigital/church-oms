import "server-only";

export interface ProgrammeReportPdfData {
  title: string;
  date: string;
  attendance: {
    men: number;
    women: number;
    teenagers: number;
    children: number;
    total: number;
    venueCapacity: number;
  };
  outcomes: {
    firstTimers: number;
    converts: number;
    newBirths: number;
    weddings: number;
  };
  notes?: string | null;
  submittedBy: string;
  submittedAt?: string | null;
  verifiedBy: string;
  verifiedAt?: string | null;
  generatedAt: string;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 50;
const TOP_Y = 790;
const BOTTOM_Y = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type FontName = "F1" | "F2";

function toPdfSafeText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/€/g, "EUR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E£]/g, "?");
}

function escapePdfString(value: string): string {
  return toPdfSafeText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function textCommand(
  text: string,
  x: number,
  y: number,
  size: number,
  font: FontName = "F1",
  gray = 0
) {
  return [
    "BT",
    `${gray.toFixed(2)} g`,
    `/${font} ${size} Tf`,
    `1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm`,
    `(${escapePdfString(text)}) Tj`,
    "ET",
  ].join("\n");
}

function lineCommand(x1: number, y: number, x2: number) {
  return `0.84 G 0.6 w ${x1.toFixed(1)} ${y.toFixed(1)} m ${x2.toFixed(
    1
  )} ${y.toFixed(1)} l S`;
}

function wrapText(text: string, fontSize: number, width = CONTENT_WIDTH): string[] {
  const safe = toPdfSafeText(text).trim();
  if (!safe) return [];

  const approxChars = Math.max(18, Math.floor(width / (fontSize * 0.52)));
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > approxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += approxChars) {
        lines.push(word.slice(i, i + approxChars));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > approxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

class ProgrammePdfLayout {
  private pages: string[][] = [[]];
  private y = TOP_Y;

  private get page() {
    return this.pages[this.pages.length - 1];
  }

  private newPage() {
    this.pages.push([]);
    this.y = TOP_Y;
    this.page.push(textCommand("Programme report (continued)", MARGIN_X, this.y, 10, "F2", 0.35));
    this.y -= 24;
  }

  private ensureSpace(height: number) {
    if (this.y - height < BOTTOM_Y) this.newPage();
  }

  addTitle(title: string, date: string) {
    this.ensureSpace(58);
    this.page.push(textCommand(title, MARGIN_X, this.y, 18, "F2"));
    this.y -= 22;
    this.page.push(textCommand(date, MARGIN_X, this.y, 10, "F1", 0.38));
    this.y -= 26;
  }

  addSection(title: string) {
    this.ensureSpace(34);
    this.page.push(textCommand(title, MARGIN_X, this.y, 12, "F2"));
    this.y -= 10;
    this.page.push(lineCommand(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X));
    this.y -= 18;
  }

  addRow(label: string, value: string | number, bold = false) {
    this.ensureSpace(24);
    this.page.push(textCommand(label, MARGIN_X, this.y, 10, "F1", 0.32));
    this.page.push(
      textCommand(String(value), PAGE_WIDTH - MARGIN_X - 70, this.y, 10, bold ? "F2" : "F1")
    );
    this.y -= 14;
    this.page.push(lineCommand(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X));
    this.y -= 10;
  }

  addParagraph(text: string) {
    const lines = wrapText(text, 10);
    for (const line of lines) {
      this.ensureSpace(15);
      this.page.push(textCommand(line, MARGIN_X, this.y, 10));
      this.y -= 14;
    }
    this.y -= 4;
  }

  addSignoff(label: string, name: string, when?: string | null) {
    this.ensureSpace(31);
    this.page.push(textCommand(label, MARGIN_X, this.y, 10, "F1", 0.32));
    this.y -= 14;
    const detail = when ? `${name} on ${when}` : name;
    for (const line of wrapText(detail, 10)) {
      this.ensureSpace(15);
      this.page.push(textCommand(line, MARGIN_X, this.y, 10, "F2"));
      this.y -= 14;
    }
    this.y -= 5;
  }

  addGeneratedAt(value: string) {
    this.ensureSpace(28);
    this.y -= 6;
    this.page.push(lineCommand(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X));
    this.y -= 17;
    this.page.push(textCommand(`Report generated ${value}`, MARGIN_X, this.y, 8, "F1", 0.42));
  }

  render() {
    return this.pages.map((commands) => commands.join("\n") + "\n");
  }
}

function makeObject(id: number, body: Buffer) {
  return Buffer.concat([
    Buffer.from(`${id} 0 obj\n`, "latin1"),
    body,
    Buffer.from("\nendobj\n", "latin1"),
  ]);
}

function makeTextObject(id: number, body: string) {
  return makeObject(id, Buffer.from(body, "latin1"));
}

function buildPdf(pages: string[]): Uint8Array {
  const pageObjectIds = pages.map((_, index) => 5 + index * 2);
  const contentObjectIds = pages.map((_, index) => 6 + index * 2);
  const objectCount = 4 + pages.length * 2;

  const objects = new Map<number, Buffer>();
  objects.set(1, makeTextObject(1, "<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(
    2,
    makeTextObject(
      2,
      `<< /Type /Pages /Kids [${pageObjectIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] /Count ${pages.length} >>`
    )
  );
  objects.set(3, makeTextObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  objects.set(4, makeTextObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));

  pages.forEach((content, index) => {
    const pageId = pageObjectIds[index];
    const contentId = contentObjectIds[index];
    const stream = Buffer.from(content, "latin1");

    objects.set(
      pageId,
      makeTextObject(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
      )
    );

    objects.set(
      contentId,
      makeObject(
        contentId,
        Buffer.concat([
          Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "latin1"),
          stream,
          Buffer.from("endstream", "latin1"),
        ])
      )
    );
  });

  const header = Buffer.concat([
    Buffer.from("%PDF-1.4\n%", "latin1"),
    Buffer.from([0xe2, 0xe3, 0xcf, 0xd3]),
    Buffer.from("\n", "latin1"),
  ]);

  const chunks: Buffer[] = [header];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let byteOffset = header.length;

  for (let id = 1; id <= objectCount; id += 1) {
    const object = objects.get(id);
    if (!object) throw new Error(`Missing PDF object ${id}`);
    offsets[id] = byteOffset;
    chunks.push(object);
    byteOffset += object.length;
  }

  const xrefOffset = byteOffset;
  const xrefLines = [
    "xref",
    `0 ${objectCount + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objectCount + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ];

  chunks.push(Buffer.from(xrefLines.join("\n"), "latin1"));
  return new Uint8Array(Buffer.concat(chunks));
}

export function createProgrammeReportPdf(data: ProgrammeReportPdfData): Uint8Array {
  const layout = new ProgrammePdfLayout();

  layout.addTitle(data.title, data.date);

  layout.addSection("Attendance");
  layout.addRow("Men", data.attendance.men);
  layout.addRow("Women", data.attendance.women);
  layout.addRow("Teenagers", data.attendance.teenagers);
  layout.addRow("Children", data.attendance.children);
  layout.addRow("Total attendance", data.attendance.total, true);
  layout.addRow("Venue capacity", data.attendance.venueCapacity);

  layout.addSection("Outcomes");
  layout.addRow("First-timers", data.outcomes.firstTimers);
  layout.addRow("Converts", data.outcomes.converts);
  layout.addRow("New births", data.outcomes.newBirths);
  layout.addRow("Weddings", data.outcomes.weddings);

  if (data.notes?.trim()) {
    layout.addSection("Notes");
    layout.addParagraph(data.notes);
  }

  layout.addSection("Sign-offs");
  layout.addSignoff("Submitted by", data.submittedBy, data.submittedAt);
  layout.addSignoff("Verified by", data.verifiedBy, data.verifiedAt);

  layout.addGeneratedAt(data.generatedAt);

  return buildPdf(layout.render());
}
