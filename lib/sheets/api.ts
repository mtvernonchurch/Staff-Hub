export type CellUpdate = { range: string; value: string };

export interface SheetsApi {
  get(tab: string): Promise<string[][]>;
  appendRows(tab: string, rows: string[][]): Promise<void>;
  updateCells(updates: CellUpdate[]): Promise<void>;
  deleteRow(tab: string, rowNumber: number): Promise<void>;
}
