import ExcelJS from "exceljs";

/**
 * Builds a single-sheet .xlsx workbook buffer from an array of row objects,
 * given a fixed column order (mirrors src/lib/csv.ts#toCsv so both formats
 * always show the same fields). Column headers are the keys themselves,
 * title-cased for readability.
 */
export async function toXlsx<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T & string)[],
  sheetName = "Export"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Church OMS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({
    header: c
      .toString()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    key: c,
    width: 18,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(columns.map((c) => row[c] ?? ""));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
