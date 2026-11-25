import { describe, expect, it } from "vitest";
import { clearSheetsReadCache, createSheetsApi } from "@/lib/sheets/google-api";

describe("sheets http client", () => {
  it("reads, appends, and updates through the REST API without the full Google library", async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method: init?.method ?? "GET", body });
      if (url.includes(":append") || url.includes(":batchUpdate") || url.includes("/values:batchUpdate")) {
        return new Response("{}", { status: 200 });
      }
      return new Response(JSON.stringify({ values: [["Name"], ["Avery"]] }), { status: 200 });
    };
    const api = createSheetsApi({ sheetId: "sheet id", accessToken: "token", fetchImpl });
    expect(await api.get("Action Items")).toEqual([["Name"], ["Avery"]]);
    await api.appendRows("Action Items", [["ai1", "Do the thing"]]);
    await api.updateCells([{ range: "'Action Items'!E2", value: "Done" }]);

    expect(calls[0]?.url).toContain("/spreadsheets/sheet%20id/values/");
    expect(calls[0]?.url).toContain("valueRenderOption=FORMATTED_VALUE");
    expect(calls[1]?.method).toBe("POST");
    expect(calls[1]?.url).toContain(":append");
    expect(calls[1]?.url).toContain("insertDataOption=INSERT_ROWS");
    expect(calls[1]?.body).toEqual({ values: [["ai1", "Do the thing"]] });
    expect(calls[2]?.body).toEqual({
      valueInputOption: "USER_ENTERED",
      data: [{ range: "'Action Items'!E2", values: [["Done"]] }],
    });
  });

  it("turns a permission error into a plain message and does not echo the body blindly as success", async () => {
    const fetchImpl: typeof fetch = async () => new Response("The caller does not have permission", { status: 403 });
    const api = createSheetsApi({ sheetId: "sheet", accessToken: "token", fetchImpl });
    await expect(api.get("Staff")).rejects.toThrow(/Share it with the service account/);
  });

  it("reads several tabs in one batch and serves the next pass from cache", async () => {
    clearSheetsReadCache();
    const delay = 80;
    const tabs = ["Staff", "Action Items", "Meetings", "Announcements", "Requests", "Budgets", "Attendance", "Workflow Cards"];
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, delay));
      const url = String(input);
      expect(url).toContain("/values:batchGet?");
      const ranges = [...new URL(url).searchParams.getAll("ranges")];
      expect(ranges).toHaveLength(tabs.length);
      return new Response(JSON.stringify({
        valueRanges: ranges.map((range) => ({ values: [[range]] })),
      }), { status: 200 });
    };
    const api = createSheetsApi({ sheetId: "speed-sheet", accessToken: "token", fetchImpl });

    const wave = async (count: number) => {
      await Promise.all(Array.from({ length: count }, () => new Promise((resolve) => setTimeout(resolve, delay))));
    };
    const beforeStart = performance.now();
    await wave(7);
    await wave(4);
    const beforeMs = performance.now() - beforeStart;

    const firstStart = performance.now();
    const grids = await Promise.all(tabs.map((tab) => api.get(tab)));
    const firstMs = performance.now() - firstStart;
    expect(calls).toBe(1);
    expect(grids[0]?.[0]?.[0]).toContain("Staff");

    const secondStart = performance.now();
    await Promise.all(tabs.map((tab) => api.get(tab)));
    const secondMs = performance.now() - secondStart;
    expect(calls).toBe(1);
    expect(firstMs, `batched ${Math.round(firstMs)}ms vs two waves ${Math.round(beforeMs)}ms`).toBeLessThan(beforeMs);
    expect(secondMs, `cached ${Math.round(secondMs)}ms`).toBeLessThan(40);
    clearSheetsReadCache();
  });
});