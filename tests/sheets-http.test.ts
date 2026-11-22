import { describe, expect, it } from "vitest";
import { createSheetsApi } from "@/lib/sheets/google-api";

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
});