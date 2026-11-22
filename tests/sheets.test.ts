import { describe, expect, it } from "vitest";
import { SheetsStore } from "@/lib/data/sheets-store";
import type { SheetsApi } from "@/lib/sheets/api";
import { columnIndex, findDataRow, planCellUpdates, recordToAppendRow } from "@/lib/sheets/codec";
import { parseServiceAccount } from "@/lib/sheets/credentials";
import { COLUMNS } from "@/lib/sheets/schema";
import { HubError } from "@/lib/hub-error";
import { parseSheetDate } from "@/lib/domain/dates";

class FakeSheets implements SheetsApi {
  writes: { type: string; tab?: string; rows?: string[][]; updates?: { range: string; value: string }[] }[] = [];
  constructor(public grids: Record<string, string[][]>) {}

  async get(tab: string) {
    const grid = this.grids[tab];
    if (!grid) throw new Error(`missing ${tab}`);
    return grid.map((row) => [...row]);
  }

  async appendRows(tab: string, rows: string[][]) {
    this.writes.push({ type: "append", tab, rows });
    this.grids[tab].push(...rows.map((row) => [...row]));
  }

  async deleteRow(tab: string, rowNumber: number) {
    this.writes.push({ type: "delete", tab, updates: [{ range: String(rowNumber), value: "" }] });
    this.grids[tab].splice(rowNumber - 1, 1);
  }

  async updateCells(updates: { range: string; value: string }[]) {
    this.writes.push({ type: "update", updates });
    for (const update of updates) {
      const match = /^'((?:[^']|'')*)'!([A-Z]+)(\d+)$/.exec(update.range);
      if (!match) throw new Error(`bad range ${update.range}`);
      const tab = match[1].replace(/''/g, "'");
      const column = columnIndex(match[2]);
      const rowIndex = Number(match[3]) - 1;
      const row = this.grids[tab][rowIndex] ?? [];
      row[column] = update.value;
      this.grids[tab][rowIndex] = row;
    }
  }
}

function actionGrid() {
  return [
    [...COLUMNS.actionItems, "Extra"],
    ["sample11", "Keep this text", "Avery Quinn", "11/18/2026", "Open", "mtg_monday", "note", "11/16/2026", "", "leave-me"],
    ["sample12", "Second", "Blake Nguyen", "11/24/2026", "Open", "", "", "11/16/2026", "", "also"],
  ];
}

describe("sheet writes", () => {
  it("appends a row without rewriting the rows already there", async () => {
    const fake = new FakeSheets({ "Action Items": actionGrid() });
    const before = fake.grids["Action Items"].slice(1, 3).map((row) => row.slice(0, 10));
    const store = new SheetsStore(fake);
    await store.createActionItem({
      id: "ai_new",
      action: "New item",
      owner: "Avery Quinn",
      due: "11/30/2026",
      status: "Open",
      meetingId: "",
      update: "",
      created: "11/22/2026",
      completedOn: "",
      ministry: "",
    });
    expect(fake.grids["Action Items"][0]).toContain("Ministry");
    expect(fake.grids["Action Items"].slice(1, 3).map((row) => row.slice(0, 10))).toEqual(before);
    expect(fake.grids["Action Items"][3][0]).toBe("ai_new");
    expect(fake.grids["Action Items"][3][1]).toBe("New item");
    expect(fake.grids["Action Items"][3].at(-1)).toBe("");
    expect(fake.writes.some((write) => write.type === "append")).toBe(true);
    expect(fake.writes.some((write) => write.type === "update")).toBe(true);
  });

  it("updates only the cells that changed", async () => {
    const fake = new FakeSheets({ "Action Items": actionGrid() });
    const store = new SheetsStore(fake);
    await store.updateActionItem("sample11", { status: "Done", completedOn: "11/22/2026" });
    const row = fake.grids["Action Items"][1];
    expect(row[0]).toBe("sample11");
    expect(row[1]).toBe("Keep this text");
    expect(row[4]).toBe("Done");
    expect(row[6]).toBe("note");
    expect(row[8]).toBe("11/22/2026");
    expect(row[9]).toBe("leave-me");
    const updates = fake.writes[0]?.updates ?? [];
    expect(updates.map((update) => update.range).sort()).toEqual(["'Action Items'!E2", "'Action Items'!I2"]);
  });

  it("refuses a duplicate id and does not write", async () => {
    const grid = actionGrid();
    grid.push(["sample11", "duplicate", "", "", "", "", "", "", "", ""]);
    const fake = new FakeSheets({ "Action Items": grid });
    const store = new SheetsStore(fake);
    await expect(store.updateActionItem("sample11", { update: "nope" })).rejects.toThrow(/More than one row/);
    expect(fake.writes).toHaveLength(0);
    expect(fake.grids["Action Items"][1][6]).toBe("note");
  });

  it("refuses to plan a write on a read-only tab", () => {
    expect(() => planCellUpdates("Workflow Cards", ["Card ID"], 2, { "Card ID": "nope" })).toThrow(/read-only/);
    expect(() => planCellUpdates("Card Actions", ["Action ID"], 2, { "Action ID": "nope" })).toThrow(/read-only/);
    expect(() => planCellUpdates("Staff", ["Name"], 2, { Name: "nope" })).toThrow(/read-only/);
    expect(() => planCellUpdates("Checklist Template", ["Area"], 2, { Area: "nope" })).toThrow(/read-only/);
  });

  it("reads workflow cards and leaves them untouched", async () => {
    const fake = new FakeSheets({
      "Workflow Cards": [
        COLUMNS.workflowCards.slice(),
        ["card1", "Baptism", "Follow up", "Guest", "Avery Quinn", "avery@mtvernon.church", "Yes", "11/18/2026", "https://planningcenter.com", "", "", "", "", ""],
      ],
      "Card Actions": [COLUMNS.cardActions.slice(), ["act1", "card1", "Add a note", "Test", "", "", "avery@mtvernon.church", "", "Done", "Noted", ""]],
    });
    const store = new SheetsStore(fake);
    const cards = await store.listWorkflowCards();
    expect(cards[0]?.workflow).toBe("Baptism");
    expect(cards[0]?.overdue).toBe("Yes");
    expect((await store.listCardActions())[0]?.status).toBe("Done");
    expect(fake.writes).toHaveLength(0);
  });

  it("aligns an append to the real header, including a curly apostrophe", () => {
    const headers = ["Check ID", "Meeting", "Order", "Area", "Owner", "What’s Covered", "Ready", "Notes"];
    const row = recordToAppendRow(headers, {
      "Check ID": "chk1",
      Meeting: "mtg",
      Order: "1",
      Area: "Platform",
      Owner: "Avery",
      "What's Covered": "Announcements",
      Ready: "FALSE",
      Notes: "",
    });
    expect(row[5]).toBe("Announcements");
    expect(row).toHaveLength(headers.length);
  });

  it("finds the sheet row, not a compacted list index", () => {
    const grid = [
      ["Item ID", "Action"],
      ["", ""],
      ["ai1", "First"],
    ];
    expect(findDataRow(grid, "Item ID", "ai1")).toBe(3);
  });

  it("parses a Google serial date and a US date the same way", () => {
    expect(parseSheetDate("46343")?.toISOString().slice(0, 10)).toBe("2026-11-17");
    expect(parseSheetDate("11/17/2026")?.toISOString().slice(0, 10)).toBe("2026-11-17");
    expect(parseSheetDate("45292")?.toISOString().slice(0, 10)).toBe("2024-01-01");
  });

  it("does not call the network when the header row is missing a column", async () => {
    const fake = new FakeSheets({ "Action Items": [["Item ID", "Action"]] });
    const store = new SheetsStore(fake);
    await expect(store.listActionItems()).rejects.toThrow(/missing/);
    expect(fake.writes).toHaveLength(0);
  });

  it("reads a service account from JSON or a key with escaped newlines, and does not echo the key", () => {
    const json = JSON.stringify({ client_email: "hub@example.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n" });
    expect(parseServiceAccount({ GOOGLE_SERVICE_ACCOUNT_JSON: json }).clientEmail).toContain("gserviceaccount.com");
    const encoded = Buffer.from(json).toString("base64");
    expect(parseServiceAccount({ GOOGLE_SERVICE_ACCOUNT_JSON: encoded }).privateKey).toContain("BEGIN PRIVATE KEY");
    const fromParts = parseServiceAccount({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "hub@example.iam.gserviceaccount.com",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
    });
    expect(fromParts.privateKey.split("\n")[0]).toBe("-----BEGIN PRIVATE KEY-----");
    expect(() => parseServiceAccount({ GOOGLE_SERVICE_ACCOUNT_JSON: "not-json" })).toThrow(/not valid JSON/);
    try {
      parseServiceAccount({ GOOGLE_SERVICE_ACCOUNT_JSON: "not-json secret-key-material" });
    } catch (error) {
      expect(error).toBeInstanceOf(HubError);
      expect((error as Error).message).not.toContain("secret-key-material");
    }
  });
});
