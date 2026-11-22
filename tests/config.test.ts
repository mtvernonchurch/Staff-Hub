import { describe, expect, it } from "vitest";
import { authSecret, resolveAuthMode, resolveDataMode } from "@/lib/config";

describe("empty environment", () => {
  it("stays in sample mode when nothing is configured", () => {
    expect(resolveDataMode({})).toBe("mock");
    expect(resolveAuthMode({})).toBe("mock");
  });

  it("uses sheets and Google only when those values are set", () => {
    expect(
      resolveDataMode({
        GOOGLE_SHEET_ID: "sheet",
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "hub@example.iam.gserviceaccount.com",
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "key",
      }),
    ).toBe("sheets");
    expect(resolveAuthMode({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret" })).toBe("google");
  });

  it("an explicit mock mode wins over real credentials", () => {
    expect(resolveDataMode({ DATA_MODE: "mock", GOOGLE_SHEET_ID: "sheet", GOOGLE_SERVICE_ACCOUNT_JSON: "{}" })).toBe(
      "mock",
    );
    expect(resolveAuthMode({ AUTH_MODE: "mock", AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret" })).toBe("mock");
  });

  it("still has a secret when AUTH_SECRET is unset", () => {
    const previous = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    expect(authSecret().length).toBeGreaterThan(10);
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  });
});
