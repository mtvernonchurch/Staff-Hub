import { HubError } from "@/lib/hub-error";

export type ServiceAccount = { clientEmail: string; privateKey: string };

export function parseServiceAccount(env: Record<string, string | undefined>): ServiceAccount {
  const json = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    let parsed: unknown;
    try {
      const raw = json.startsWith("{") ? json : Buffer.from(json, "base64").toString("utf8");
      parsed = JSON.parse(raw);
    } catch {
      throw new HubError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the key file, or its base64.");
    }
    const record = parsed as { client_email?: unknown; private_key?: unknown };
    const clientEmail = typeof record.client_email === "string" ? record.client_email.trim() : "";
    const privateKey = typeof record.private_key === "string" ? record.private_key : "";
    if (!clientEmail || !privateKey.includes("PRIVATE KEY")) {
      throw new HubError("The service account JSON needs client_email and private_key.");
    }
    return { clientEmail, privateKey };
  }

  const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  let privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  if (!clientEmail || !privateKey.trim()) {
    throw new HubError("Add the service account JSON, or the service account email and private key.");
  }
  privateKey = privateKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, "\n");
  if (!privateKey.includes("PRIVATE KEY")) {
    throw new HubError("The private key does not look like a Google service account key.");
  }
  return { clientEmail, privateKey };
}
