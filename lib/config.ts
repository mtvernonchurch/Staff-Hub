type Env = {
  DATA_MODE?: string;
  AUTH_MODE?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  ALLOWED_DOMAIN?: string;
  AUTH_SECRET?: string;
  NODE_ENV?: string;
  DATA_SOURCE_BUDGET?: string;
};

function filled(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

export function hasSheetCredentials(env: Env): boolean {
  return Boolean(
    filled(env.GOOGLE_SHEET_ID) &&
      (filled(env.GOOGLE_SERVICE_ACCOUNT_JSON) ||
        (filled(env.GOOGLE_SERVICE_ACCOUNT_EMAIL) && filled(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY))),
  );
}

export function resolveDataMode(env: Env): "mock" | "sheets" {
  const requested = env.DATA_MODE?.trim().toLowerCase();
  if (requested === "mock") return "mock";
  if (requested === "sheets") return "sheets";
  return hasSheetCredentials(env) ? "sheets" : "mock";
}

export function resolveAuthMode(env: Env): "mock" | "google" {
  const requested = env.AUTH_MODE?.trim().toLowerCase();
  if (requested === "mock") return "mock";
  if (requested === "google") return "google";
  return filled(env.AUTH_GOOGLE_ID) && filled(env.AUTH_GOOGLE_SECRET) ? "google" : "mock";
}

export function dataMode(): "mock" | "sheets" {
  return resolveDataMode(process.env);
}

export function authMode(): "mock" | "google" {
  return resolveAuthMode(process.env);
}

export function allowedDomain(): string {
  return process.env.ALLOWED_DOMAIN?.trim() || "mtvernon.church";
}

const PREVIEW_SECRET = "dev-only-mv-staff-hub-secret";

/**
 * The secret that signs the login cookie. The public preview secret is only
 * used while the hub shows sample data; with the real sheet it returns
 * undefined so the hub refuses to open instead of trusting a secret that is
 * printed in this public repository.
 */
export function authSecret(env: Env = process.env): string | undefined {
  if (env.AUTH_SECRET?.trim()) return env.AUTH_SECRET.trim();
  return resolveDataMode(env) === "mock" ? PREVIEW_SECRET : undefined;
}

/** "Pick a person" sign-in is only for sample data, never the real staff list. */
export function previewSignInAllowed(env: Env = process.env): boolean {
  return resolveAuthMode(env) === "mock" && resolveDataMode(env) === "mock";
}

/**
 * A setup mistake that would let the wrong people in. The sign-in page and
 * every hub page show this instead of opening.
 */
export function securityProblem(env: Env = process.env): string | null {
  if (resolveDataMode(env) !== "sheets") return null;
  if (resolveAuthMode(env) !== "google") {
    return "The hub is connected to the real staff sheet, but Google sign-in is not turned on. Set AUTH_MODE=google with the Google client id and secret before anyone signs in.";
  }
  if (!googleAuthReadyIn(env)) {
    return "Google sign-in needs the OAuth client id and secret. The setup steps are in the README.";
  }
  if (!env.AUTH_SECRET?.trim()) {
    return "Set AUTH_SECRET in the hosting environment before opening the real staff list.";
  }
  return null;
}

function googleAuthReadyIn(env: Env): boolean {
  return Boolean(env.AUTH_GOOGLE_ID?.trim() && env.AUTH_GOOGLE_SECRET?.trim());
}

export function googleAuthReady(): boolean {
  return googleAuthReadyIn(process.env);
}

export type BudgetSourceKind = "mock" | "sheet" | "bill";

/** mock by default. sheet follows DATA_MODE=sheets. bill is a stub until the API is wired. */
export function budgetSourceKind(env: Env = process.env): BudgetSourceKind {
  const requested = env.DATA_SOURCE_BUDGET?.trim().toLowerCase();
  if (requested === "bill" || requested === "sheet" || requested === "mock") return requested;
  return resolveDataMode(env) === "sheets" ? "sheet" : "mock";
}
