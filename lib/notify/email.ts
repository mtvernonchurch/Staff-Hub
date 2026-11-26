import { JWT } from "google-auth-library";
import { parseServiceAccount } from "@/lib/sheets/credentials";
import { emailSender, emailSenderName, siteUrl } from "@/lib/notify/config";
import type { Notice } from "@/lib/notify/events";

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

let cached: { key: string; client: JWT } | null = null;

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  const clean = oneLine(value);
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function wrap(base64: string): string {
  return base64.replace(/.{1,76}/g, (line) => `${line}\r\n`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function noticeLink(notice: Pick<Notice, "path">, base = siteUrl()): string {
  return `${base}${notice.path.startsWith("/") ? notice.path : `/${notice.path}`}`;
}

/** Plain text and a simple HTML version with one button back into the hub. */
export function emailParts(notice: Notice, base = siteUrl()): { subject: string; text: string; html: string } {
  const link = noticeLink(notice, base);
  const settings = `${base}/notifications`;
  const text = `${notice.body}\n\nOpen it in the Staff Hub: ${link}\n\nChange which alerts you get: ${settings}\n`;
  const paragraphs = notice.body
    .split("\n")
    .map((line) => `<p style="margin:0 0 10px">${escapeHtml(line)}</p>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3eee4;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">
<div style="max-width:520px;margin:0 auto;background:#fffaf2;border-radius:12px;padding:24px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#2f6b55">MV Staff Hub</p>
<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#04354b">${escapeHtml(notice.title)}</h1>
${paragraphs}
<p style="margin:18px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#04354b;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold">Open in the Staff Hub</a></p>
<p style="margin:18px 0 0;font-size:12px;color:#5c675f"><a href="${escapeHtml(settings)}" style="color:#5c675f">Change which alerts you get</a></p>
</div></body></html>`;
  return { subject: notice.title, text, html };
}

/** An RFC 2822 message, base64url-encoded the way the Gmail API wants it. */
export function buildRawEmail(input: { from: string; fromName: string; to: string; subject: string; text: string; html: string }): string {
  const boundary = `mvhub_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: ${encodeHeader(input.fromName)} <${oneLine(input.from)}>`,
    `To: <${oneLine(input.to)}>`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap(Buffer.from(input.text, "utf8").toString("base64")),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap(Buffer.from(input.html, "utf8").toString("base64")),
    `--${boundary}--`,
    "",
  ];
  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

function client(): JWT {
  const sender = emailSender();
  const account = parseServiceAccount(process.env);
  const key = `${account.clientEmail}\0${sender}`;
  if (cached?.key === key) return cached.client;
  const jwt = new JWT({ email: account.clientEmail, key: account.privateKey, scopes: [GMAIL_SEND_SCOPE], subject: sender });
  cached = { key, client: jwt };
  return jwt;
}

/**
 * Sends one email as the church account in NOTIFY_EMAIL_FROM. The service
 * account needs domain-wide delegation for the gmail.send scope only.
 */
export async function sendEmail(notice: Notice, fetchImpl: typeof fetch = fetch): Promise<void> {
  const parts = emailParts(notice);
  const raw = buildRawEmail({ from: emailSender(), fromName: emailSenderName(), to: notice.email, ...parts });
  const { token } = await client().getAccessToken();
  if (!token) throw new Error("No Gmail access token");
  const response = await fetchImpl(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Gmail send failed (${response.status}): ${detail}`);
  }
}
