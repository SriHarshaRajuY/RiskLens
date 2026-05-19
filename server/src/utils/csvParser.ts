import { parseString } from "@fast-csv/parse";

export type CsvRow = Record<string, string>;

export async function parseCsv(csvContent: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];

    parseString(csvContent, {
      headers: true,
      ignoreEmpty: true,
      trim: true,
      renameHeaders: false
    })
      .on("error", reject)
      .on("data", (row: CsvRow) => rows.push(normalizeRow(row)))
      .on("end", () => resolve(rows));
  });
}

function normalizeRow(row: CsvRow): CsvRow {
  return Object.entries(row).reduce<CsvRow>((normalized, [key, value]) => {
    normalized[key.trim().toLowerCase()] = String(value ?? "").trim();
    return normalized;
  }, {});
}
