export function safeHttps(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeIconSrc(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("https://")) return safeHttps(trimmed);
  if (/^data:image\/(png|jpeg|gif|webp|svg\+xml);/i.test(trimmed)) return trimmed;
  return null;
}

export function safeReturnTo(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (value.length > 300) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\n")) {
    return fallback;
  }
  return value;
}

export function withQuery(path: string, key: string, value: string): string {
  const url = new URL(safeReturnTo(path, "/"), "http://staff-hub.local");
  url.searchParams.set(key, value.slice(0, 300));
  return `${url.pathname}${url.search}`;
}
