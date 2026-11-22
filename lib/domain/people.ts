export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailOnDomain(email: string, domain: string): boolean {
  const normalized = normalizeEmail(email);
  const host = domain.trim().toLowerCase().replace(/^@/, "");
  return normalized.endsWith(`@${host}`) && normalized.split("@")[0].length > 0;
}

export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
