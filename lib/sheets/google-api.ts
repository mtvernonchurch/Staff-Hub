import { JWT } from "google-auth-library";
import { HubError } from "@/lib/hub-error";
import type { SheetsApi } from "@/lib/sheets/api";
import { quoteTab } from "@/lib/sheets/codec";
import { parseServiceAccount } from "@/lib/sheets/credentials";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

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

type FetchImpl = typeof fetch;

/**
 * Talks to the Sheets REST API with a bearer token. Tests pass a stand-in
 * token and fetch so this never needs the network or the full Google client.
 */
export function createSheetsApi(options: {
  sheetId: string;
  accessToken: string;
  fetchImpl?: FetchImpl;
}): SheetsApi {
  const fetchImpl = options.fetchImpl ?? fetch;
  const root = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(options.sheetId)}`;

  async function request(path: string, init?: { method?: string; body?: unknown }): Promise<unknown> {
    const response = await fetchImpl(`${root}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    if (!response.ok) explain(new Error(`${response.status} ${text.slice(0, 300)}`));
    return text ? JSON.parse(text) : {};
  }

  return {
    async get(tab) {
      try {
        const range = encodeURIComponent(quoteTab(tab));
        const data = (await request(`/values/${range}?valueRenderOption=FORMATTED_VALUE`)) as {
          values?: unknown[][];
        };
        return (data.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
      } catch (error) {
        if (error instanceof HubError) throw error;
        explain(error);
      }
    },
    async appendRows(tab, rows) {
      if (rows.length === 0) return;
      try {
        const range = encodeURIComponent(`${quoteTab(tab)}!A1`);
        await request(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
          method: "POST",
          body: { values: rows },
        });
      } catch (error) {
        if (error instanceof HubError) throw error;
        explain(error);
      }
    },
    async updateCells(updates) {
      if (updates.length === 0) return;
      try {
        await request("/values:batchUpdate", {
          method: "POST",
          body: {
            valueInputOption: "USER_ENTERED",
            data: updates.map((update) => ({ range: update.range, values: [[update.value]] })),
          },
        });
      } catch (error) {
        if (error instanceof HubError) throw error;
        explain(error);
      }
    },
  };
}

export async function createGoogleSheetsApi(env: NodeJS.ProcessEnv = process.env): Promise<SheetsApi> {
  const sheetId = env.GOOGLE_SHEET_ID?.trim();
  if (!sheetId) throw new HubError("Set GOOGLE_SHEET_ID to the spreadsheet id from the sheet URL.");
  const account = parseServiceAccount(env);
  const client = new JWT({
    email: account.clientEmail,
    key: account.privateKey,
    scopes: [SHEETS_SCOPE],
  });
  let token: string | null | undefined;
  try {
    token = (await client.getAccessToken()).token;
  } catch (error) {
    explain(error);
  }
  if (!token) throw new HubError("The hub could not sign in to Google Sheets. Check the service account key.");
  return createSheetsApi({ sheetId, accessToken: token });
}
