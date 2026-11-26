import { describe, expect, it } from "vitest";
import { authSecret, previewSignInAllowed, resolveAuthMode, resolveDataMode, securityProblem } from "@/lib/config";

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

  it("still has a secret for sample data when AUTH_SECRET is unset", () => {
    expect(authSecret({})?.length).toBeGreaterThan(10);
  });
});

const realSheet = {
  DATA_MODE: "sheets",
  GOOGLE_SHEET_ID: "sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: "{}",
};

describe("real staff data is never opened to the wrong people", () => {
  it("never uses the public preview secret with the real sheet", () => {
    expect(authSecret(realSheet)).toBeUndefined();
    expect(authSecret({ ...realSheet, AUTH_SECRET: "real-secret" })).toBe("real-secret");
  });

  it("turns off pick-a-person sign-in whenever the real sheet is on", () => {
    expect(previewSignInAllowed({})).toBe(true);
    expect(previewSignInAllowed(realSheet)).toBe(false);
    expect(previewSignInAllowed({ ...realSheet, AUTH_MODE: "mock" })).toBe(false);
  });

  it("refuses to open when the real sheet is on without Google sign-in", () => {
    expect(securityProblem(realSheet)).toMatch(/Google sign-in is not turned on/);
    expect(securityProblem({ ...realSheet, AUTH_MODE: "google" })).toMatch(/client id and secret/);
  });

  it("refuses to open when the real sheet is on without AUTH_SECRET", () => {
    const google = { ...realSheet, AUTH_MODE: "google", AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret" };
    expect(securityProblem(google)).toMatch(/AUTH_SECRET/);
    expect(securityProblem({ ...google, AUTH_SECRET: "real-secret" })).toBeNull();
  });

  it("has no problem in sample mode", () => {
    expect(securityProblem({})).toBeNull();
  });
});
