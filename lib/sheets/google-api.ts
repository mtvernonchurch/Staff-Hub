import { google } from "googleapis";
import { HubError } from "@/lib/hub-error";
import type { SheetsApi } from "@/lib/sheets/api";
import { parseServiceAccount } from "@/lib/sheets/credentials";
import { quoteTab } from "@/lib/sheets/codec";

function explain(error: unknown): never {
  const message = error instanceof Error ? error.message : "Unknown Google Sheets error";
  console.error("Sheets API error:", message.slice(0, 500));
  if (/permission|forbidden|403|not found|404/i.test(message)) {
    throw new HubError(
      "The hub could not open the Google Sheet. Share it with the service account email as an Editor, and check GOOGLE_SHEET_ID.",
    );
  }
  if (/quota/i.test(message)) {
    throw new HubError("Google Sheets is busy. Wait a minute and try again.");
  }
  throw new HubError("The hub could not reach Google Sheets. Try again in a moment.");
}

export function createGoogleSheetsApi(env: NodeJS.ProcessEnv = process.env): SheetsApi {
  const sheetId = env.GOOGLE_SHEET_ID?.trim();
  if (!sheetId) throw new HubError("Set GOOGLE_SHEET_ID to the spreadsheet id from the sheet URL.");
  const account = parseServiceAccount(env);
  const auth = new google.auth.JWT({
    email: account.clientEmail,
    key: account.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  return {
    async get(tab) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: quoteTab(tab),
          valueRenderOption: "FORMATTED_VALUE",
        });
        return (response.data.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
      } catch (error) {
        explain(error);
      }
    },
    async appendRows(tab, rows) {
      if (rows.length === 0) return;
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${quoteTab(tab)}!A1`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: rows },
        });
      } catch (error) {
        explain(error);
      }
    },
    async updateCells(updates) {
      if (updates.length === 0) return;
      try {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            valueInputOption: "USER_ENTERED",
            data: updates.map((update) => ({ range: update.range, values: [[update.value]] })),
          },
        });
      } catch (error) {
        explain(error);
      }
    },
  };
}
