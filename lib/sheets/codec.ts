import { HubError } from "@/lib/hub-error";
import { CALENDAR_CHECK_ALIASES, isWritableTab, normalizeHeader } from "@/lib/sheets/schema";

export type CellUpdate = { range: string; value: string };

export function assertWritable(tab: string): void {
  if (!isWritableTab(tab)) {
    throw new HubError(`${tab} is read-only. The hub will not change it.`);
  }
}

export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function columnIndex(letters: string): number {
  let n = 0;
  for (const char of letters.toUpperCase()) n = n * 26 + (char.charCodeAt(0) - 64);
  return n - 1;
}

export function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

export function headersOf(grid: string[][]): string[] {
  return (grid[0] ?? []).map((header) => String(header ?? "").trim());
}

function namesFor(name: string): string[] {
  return [name, ...(CALENDAR_CHECK_ALIASES[name] ?? [])];
}

function headerMatches(header: string, name: string): boolean {
  return namesFor(name).some((candidate) => normalizeHeader(header) === normalizeHeader(candidate));
}

export function assertColumns(headers: string[], required: readonly string[], tab: string): void {
  const missing = required.filter((column) => !headers.some((header) => headerMatches(header, column)));
  if (missing.length > 0) {
    throw new HubError(
      `${tab} is missing ${missing.join(", ")}. The hub left that tab unchanged. Check the header row.`,
    );
  }
}

export function headerIndex(headers: string[], name: string): number {
  const index = headers.findIndex((header) => headerMatches(header, name));
  if (index < 0) throw new HubError(`Column "${name}" was not found.`);
  return index;
}

export function gridToRecords(grid: string[][]): Record<string, string>[] {
  const headers = headersOf(grid);
  const records: Record<string, string>[] = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    if (row.every((cell) => !String(cell ?? "").trim())) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = String(row[index] ?? "").trim();
    });
    records.push(record);
  }
  return records;
}

/** Sheet row number (header is row 1). Throws if the id is missing or duplicated. */
export function findDataRow(grid: string[][], idColumn: string, id: string): number {
  const headers = headersOf(grid);
  const index = headerIndex(headers, idColumn);
  const wanted = id.trim();
  const matches: number[] = [];
  for (let i = 1; i < grid.length; i++) {
    const cell = String(grid[i]?.[index] ?? "").trim();
    if (cell && cell === wanted) matches.push(i + 1);
  }
  if (matches.length === 0) throw new HubError("That record is no longer on the sheet. Refresh and try again.");
  if (matches.length > 1) {
    throw new HubError(`More than one row has the id ${wanted}. Nothing was changed.`);
  }
  return matches[0];
}

function valueForHeader(record: Record<string, string>, header: string): string | undefined {
  if (record[header] !== undefined) return record[header];
  const match = Object.entries(record).find(([key]) => normalizeHeader(key) === normalizeHeader(header));
  if (match) return match[1];
  const canonical = Object.entries(CALENDAR_CHECK_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizeHeader(alias) === normalizeHeader(header)),
  );
  if (canonical && record[canonical[0]] !== undefined) return record[canonical[0]];
  return undefined;
}

export function recordToAppendRow(headers: string[], record: Record<string, string>): string[] {
  return headers.map((header) => {
    if (!header) return "";
    return valueForHeader(record, header) ?? "";
  });
}

/**
 * Plans single-cell writes. Untouched columns are omitted so a concurrent edit
 * to another field is not overwritten.
 */
export function planCellUpdates(
  tab: string,
  headers: string[],
  rowNumber: number,
  changes: Record<string, string>,
): CellUpdate[] {
  assertWritable(tab);
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new HubError("Refusing to write over the header row.");
  }
  return Object.entries(changes).map(([column, value]) => {
    const index = headerIndex(headers, column);
    return {
      range: `${quoteTab(tab)}!${columnLetter(index)}${rowNumber}`,
      value,
    };
  });
}

export function cell(record: Record<string, string>, name: string, aliases: readonly string[] = []): string {
  for (const candidate of [name, ...aliases]) {
    if (record[candidate] !== undefined) return record[candidate];
    const match = Object.entries(record).find(([key]) => normalizeHeader(key) === normalizeHeader(candidate));
    if (match) return match[1];
  }
  return "";
}

export function parseBool(value: string): boolean {
  return /^(true|yes|y|1)$/i.test(value.trim());
}

export function formatBool(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}
