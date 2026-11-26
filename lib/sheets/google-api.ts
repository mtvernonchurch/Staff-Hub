import { JWT } from "google-auth-library";
import { HubError } from "@/lib/hub-error";
import type { SheetsApi } from "@/lib/sheets/api";
import { quoteTab } from "@/lib/sheets/codec";
import { parseServiceAccount } from "@/lib/sheets/credentials";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const READ_TTL_MS = 45_000;
const CLIENT_TTL_MS = 30 * 60 * 1000;

type ReadHit = { at: number; values: string[][] };
const readCache = new Map<string, ReadHit>();
const apiClients = new Map<string, { at: number; api: SheetsApi }>();

function cacheKey(sheetId: string, tab: string): string {
  return `${sheetId}\0${tab}`;
}

function copyGrid(values: string[][]): string[][] {
  return values.map((row) => [...row]);
}

function normalizeGrid(values: unknown[][] | undefined): string[][] {
  return (values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
}

export function clearSheetsReadCache(): void {
  readCache.clear();
}

function rememberGrid(sheetId: string, tab: string, values: string[][]) {
  readCache.set(cacheKey(sheetId, tab), { at: Date.now(), values: copyGrid(values) });
}

function forgetSheet(sheetId: string) {
  const prefix = `${sheetId}\0`;
  for (const key of readCache.keys()) {
    if (key.startsWith(prefix)) readCache.delete(key);
  }
}

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

  async function sheetNumber(tab: string): Promise<number> {
    const response = await fetchImpl(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(options.sheetId)}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${options.accessToken}` } },
    );
    const text = await response.text();
    if (!response.ok) explain(new Error(`${response.status} ${text.slice(0, 300)}`));
    const data = JSON.parse(text) as { sheets?: { properties?: { title?: string; sheetId?: number } }[] };
    const found = data.sheets?.find((sheet) => sheet.properties?.title === tab);
    if (found?.properties?.sheetId == null) throw new HubError(`The ${tab} tab was not found.`);
    return found.properties.sheetId;
  }

  type Waiter = { resolve: (rows: string[][]) => void; reject: (error: unknown) => void };
  const waiters = new Map<string, Waiter>();
  const inflight = new Map<string, Promise<string[][]>>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function fresh(tab: string): string[][] | null {
    const hit = readCache.get(cacheKey(options.sheetId, tab));
    if (!hit || Date.now() - hit.at >= READ_TTL_MS) return null;
    return copyGrid(hit.values);
  }

  async function fetchTabs(tabs: string[]): Promise<Map<string, string[][]>> {
    if (tabs.length === 1) {
      const tab = tabs[0]!;
      const range = encodeURIComponent(quoteTab(tab));
      const data = (await request(`/values/${range}?valueRenderOption=FORMATTED_VALUE`)) as { values?: unknown[][] };
      return new Map([[tab, normalizeGrid(data.values)]]);
    }
    const params = new URLSearchParams();
    for (const tab of tabs) params.append("ranges", quoteTab(tab));
    params.set("valueRenderOption", "FORMATTED_VALUE");
    const data = (await request(`/values:batchGet?${params.toString()}`)) as { valueRanges?: { values?: unknown[][] }[] };
    const ranges = data.valueRanges ?? [];
    return new Map(tabs.map((tab, index) => [tab, normalizeGrid(ranges[index]?.values)]));
  }

  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const tabs = [...waiters.keys()];
      const queued = new Map(waiters);
      waiters.clear();
      fetchTabs(tabs).then((grids) => {
        for (const tab of tabs) {
          const rows = grids.get(tab) ?? [];
          rememberGrid(options.sheetId, tab, rows);
          queued.get(tab)?.resolve(rows);
          inflight.delete(tab);
        }
      }).catch((error: unknown) => {
        const wrapped = error instanceof HubError ? error : new HubError("The hub could not reach Google Sheets. Try again in a moment.");
        for (const tab of tabs) {
          queued.get(tab)?.reject(wrapped);
          inflight.delete(tab);
        }
      });
    }, 0);
  }

  function enqueue(tab: string): Promise<string[][]> {
    const cached = fresh(tab);
    if (cached) return Promise.resolve(cached);
    const pending = inflight.get(tab);
    if (pending) return pending.then((rows) => copyGrid(rows));
    let resolve: Waiter["resolve"] = () => {};
    let reject: Waiter["reject"] = () => {};
    const promise = new Promise<string[][]>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    waiters.set(tab, { resolve, reject });
    inflight.set(tab, promise);
    schedule();
    return promise.then((rows) => copyGrid(rows));
  }

  return {
    async ensureTab(tab, headers) {
      const response = await fetchImpl(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(options.sheetId)}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${options.accessToken}` } },
      );
      const text = await response.text();
      if (!response.ok) explain(new Error(`${response.status} ${text.slice(0, 300)}`));
      const data = JSON.parse(text) as { sheets?: { properties?: { title?: string } }[] };
      const exists = data.sheets?.some((sheet) => sheet.properties?.title === tab);
      if (!exists) {
        const created = await fetchImpl(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(options.sheetId)}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
          },
        );
        if (!created.ok) {
          const body = await created.text();
          explain(new Error(`${created.status} ${body.slice(0, 300)}`));
        }
      }
      const current = exists ? await request(`/values/${encodeURIComponent(quoteTab(tab))}?valueRenderOption=FORMATTED_VALUE`) as { values?: string[][] } : { values: [] };
      const header = current.values?.[0] ?? [];
      if (header.some((cell) => String(cell ?? "").trim())) return;
      forgetSheet(options.sheetId);
      await request(`/values/${encodeURIComponent(`${quoteTab(tab)}!A1`)}?valueInputOption=RAW`, {
        method: "PUT",
        body: { values: [headers] },
      });
    },
    async deleteRow(tab, rowNumber) {
      forgetSheet(options.sheetId);
      if (rowNumber < 2) throw new HubError("Refusing to delete the header row.");
      const sheetId = await sheetNumber(tab);
      const response = await fetchImpl(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(options.sheetId)}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                deleteDimension: {
                  range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
                },
              },
            ],
          }),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        explain(new Error(`${response.status} ${text.slice(0, 300)}`));
      }
    },
    async get(tab) {
      try {
        return await enqueue(tab);
      } catch (error) {
        if (error instanceof HubError) throw error;
        explain(error);
      }
    },
    async appendRows(tab, rows) {
      forgetSheet(options.sheetId);
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
      forgetSheet(options.sheetId);
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
  const key = `${sheetId}\0${account.clientEmail}`;
  const cached = apiClients.get(key);
  if (cached && Date.now() - cached.at < CLIENT_TTL_MS) return cached.api;
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
  const api = createSheetsApi({ sheetId, accessToken: token });
  apiClients.set(key, { at: Date.now(), api });
  return api;
}
