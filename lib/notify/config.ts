type Env = Record<string, string | undefined>;

function filled(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** The hub's own address, used for links in emails and alerts. */
export function siteUrl(env: Env = process.env): string {
  const explicit = filled(env.AUTH_URL) || filled(env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  const production = filled(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (production && filled(env.VERCEL_ENV) === "production") return `https://${production}`;
  const preview = filled(env.VERCEL_BRANCH_URL) || filled(env.VERCEL_URL);
  if (preview) return `https://${preview}`;
  return "http://localhost:3000";
}

/** The church Google account the hub sends email as, such as staffhub@mtvernon.church. */
export function emailSender(env: Env = process.env): string {
  return filled(env.NOTIFY_EMAIL_FROM).toLowerCase();
}

export function emailSenderName(env: Env = process.env): string {
  return filled(env.NOTIFY_EMAIL_NAME) || "MV Staff Hub";
}

function hasServiceAccount(env: Env): boolean {
  return Boolean(
    filled(env.GOOGLE_SERVICE_ACCOUNT_JSON) ||
      (filled(env.GOOGLE_SERVICE_ACCOUNT_EMAIL) && filled(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)),
  );
}

/** Email goes out only with a sender address and the service account that may send as it. */
export function emailReady(env: Env = process.env): boolean {
  return Boolean(emailSender(env) && hasServiceAccount(env));
}

export function pushPublicKey(env: Env = process.env): string {
  return filled(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) || filled(env.VAPID_PUBLIC_KEY);
}

export function pushPrivateKey(env: Env = process.env): string {
  return filled(env.VAPID_PRIVATE_KEY);
}

/** The contact the phone push services see. A mailto: address or the hub's https address. */
export function pushSubject(env: Env = process.env): string {
  const explicit = filled(env.VAPID_SUBJECT);
  if (explicit) return explicit;
  const sender = emailSender(env);
  if (sender) return `mailto:${sender}`;
  return siteUrl(env);
}

export function pushReady(env: Env = process.env): boolean {
  return Boolean(pushPublicKey(env) && pushPrivateKey(env));
}
