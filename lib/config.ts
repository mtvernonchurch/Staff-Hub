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

export function authSecret(): string {
  if (process.env.AUTH_SECRET?.trim()) return process.env.AUTH_SECRET.trim();
  return "dev-only-mv-staff-hub-secret";
}

export function googleAuthReady(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());
}
