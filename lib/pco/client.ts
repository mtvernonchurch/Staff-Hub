import { HubError } from "@/lib/hub-error";
import type { PcoDocument } from "@/lib/pco/types";

const API = "https://api.planningcenteronline.com";
const PAGE_CAP = 8;

export type PcoDeps = {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  appId: string;
  secret: string;
  sleep?: (ms: number) => Promise<void>;
};

function authHeader(appId: string, secret: string): string {
  return `Basic ${Buffer.from(`${appId}:${secret}`).toString("base64")}`;
}

function nextUrl(link: string | null | undefined): string {
  if (!link) return "";
  try {
    const url = new URL(link, API);
    if (url.origin !== "https://api.planningcenteronline.com") return "";
    return url.toString();
  } catch {
    return "";
  }
}

async function readPage(url: string, deps: PcoDeps, attempt = 0): Promise<PcoDocument> {
  const response = await deps.fetch(url, {
    headers: {
      Authorization: authHeader(deps.appId, deps.secret),
      Accept: "application/json",
    },
    next: { revalidate: 900 },
  } as RequestInit);
  if (response.status === 429 && attempt < 1) {
    const retry = Number(response.headers.get("retry-after") ?? "1");
    const seconds = Number.isFinite(retry) && retry > 0 ? retry : 1;
    await (deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(Math.min(seconds, 5) * 1000);
    return readPage(url, deps, attempt + 1);
  }
  if (!response.ok) throw new HubError("Couldn't load Planning Center.");
  return (await response.json()) as PcoDocument;
}

/** Follow Planning Center's next link, staying on their host, and stop after a few pages. */
export async function pcoList(path: string, query: Record<string, string>, deps: PcoDeps, maxPages = PAGE_CAP): Promise<PcoDocument[]> {
  const pages: PcoDocument[] = [];
  let url = `${API}${path}?${new URLSearchParams(query).toString()}`;
  const seen = new Set<string>();
  const cap = Math.max(1, Math.min(maxPages, 20));
  for (let page = 0; page < cap && url; page += 1) {
    if (seen.has(url)) break;
    seen.add(url);
    const doc = await readPage(url, deps);
    pages.push(doc);
    url = nextUrl(doc.links?.next);
  }
  return pages;
}
