import { parseFile, parseString } from "@fast-csv/parse";

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

export async function parseCsvFile(filePath: string, onRow: (row: CsvRow, rowNumber: number) => Promise<void> | void): Promise<number> {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    const parser = parseFile(filePath, {
      headers: true,
      ignoreEmpty: true,
      trim: true,
      renameHeaders: false
    });

    parser.on("error", reject);
    parser.on("data", (row: CsvRow) => {
      parser.pause();
      rowCount += 1;
      Promise.resolve(onRow(normalizeRow(row), rowCount + 1))
        .then(() => parser.resume())
        .catch((error) => {
          parser.destroy(error);
          reject(error);
        });
    });
    parser.on("end", () => resolve(rowCount));
  });
}

function normalizeRow(row: CsvRow): CsvRow {
  return Object.entries(row).reduce<CsvRow>((normalized, [key, value]) => {
    normalized[key.trim().toLowerCase()] = String(value ?? "").trim();
    return normalized;
  }, {});
}
