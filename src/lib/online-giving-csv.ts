export interface ParsedOnlineGivingRow {
  transaction_date: string;
  amount: number;
  reference: string | null;
  external_id: string | null;
}

export interface ParsedOnlineGivingCsv {
  rows: ParsedOnlineGivingRow[];
  total: number;
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "transaction_date", "transaction date", "paid_at", "payment_date"],
  amount: ["amount", "gross", "gross_amount", "payment_amount", "value"],
  reference: ["reference", "description", "memo", "payment_reference", "note"],
  external_id: ["external_id", "transaction_id", "payment_id", "id", "reference_id"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, "_");
}

function findColumn(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseAmount(value: string) {
  const cleaned = value.trim().replace(/[£$€,s]/g, "");
  const amount = Number(cleaned);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid transaction amount: "${value}"`);
  }

  return Math.round(amount * 100) / 100;
}

function parseSlashDate(value: string, localeCode: string) {
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;

  const [, first, second, year] = match;
  const monthFirst = localeCode.toLowerCase() === "en-us";
  const day = Number(monthFirst ? second : first);
  const month = Number(monthFirst ? first : second);
  const yyyy = Number(year);

  const date = new Date(Date.UTC(yyyy, month - 1, day));
  if (
    date.getUTCFullYear() !== yyyy ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid transaction date: "${value}"`);
  }

  return [
    String(yyyy).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function parseDate(value: string, localeCode: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(`Invalid transaction date: "${value}"`);
    }
    return trimmed;
  }

  const slash = parseSlashDate(trimmed, localeCode);
  if (slash) return slash;

  throw new Error(
    `Unsupported transaction date: "${value}". Use YYYY-MM-DD or your regional DD/MM/YYYY format.`
  );
}

export function parseOnlineGivingCsv(
  text: string,
  localeCode = "en-GB"
): ParsedOnlineGivingCsv {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The CSV must include a header row and at least one transaction.");
  }

  const headers = splitCsvLine(lines[0]);
  const dateIndex = findColumn(headers, HEADER_ALIASES.date);
  const amountIndex = findColumn(headers, HEADER_ALIASES.amount);
  const referenceIndex = findColumn(headers, HEADER_ALIASES.reference);
  const externalIdIndex = findColumn(headers, HEADER_ALIASES.external_id);

  if (dateIndex < 0 || amountIndex < 0) {
    throw new Error("The CSV must include date and amount columns.");
  }

  if (lines.length - 1 > 5000) {
    throw new Error("A statement may contain at most 5000 transactions.");
  }

  const rows = lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);

    const dateRaw = cells[dateIndex] ?? "";
    const amountRaw = cells[amountIndex] ?? "";

    if (!dateRaw || !amountRaw) {
      throw new Error(`Row ${rowIndex + 2} is missing a date or amount.`);
    }

    const reference =
      referenceIndex >= 0 ? (cells[referenceIndex]?.trim() || null) : null;
    const externalId =
      externalIdIndex >= 0 ? (cells[externalIdIndex]?.trim() || null) : null;

    return {
      transaction_date: parseDate(dateRaw, localeCode),
      amount: parseAmount(amountRaw),
      reference,
      external_id: externalId,
    };
  });

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return {
    rows,
    total: Math.round(total * 100) / 100,
  };
}
