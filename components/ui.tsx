import { safeHttps, safeIconSrc } from "@/lib/domain/links";

export function PageHeader({ kicker, title, lede }: { kicker?: string; title: string; lede?: string }) {
  return (
    <header className="page-header">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1>{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
    </header>
  );
}

export function Flash({ error, notice }: { error?: string; notice?: string }) {
  if (error) return <p className="banner banner-error" role="alert">{error}</p>;
  if (notice) return <p className="banner banner-ok" role="status">{notice}</p>;
  return null;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function OutLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const safe = safeHttps(href);
  if (!safe) return <span className={className}>{children}</span>;
  return (
    <a className={className} href={safe} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function IconImage({ icon, alt }: { icon: string; alt: string }) {
  const src = safeIconSrc(icon);
  if (!src) return null;
  return <img src={src} alt={alt} width={28} height={28} />;
}

export function Problem({ message }: { message: string }) {
  return (
    <section className="problem">
      <p className="kicker">Staff Hub</p>
      <h1>Something got stuck</h1>
      <p className="lede">{message}</p>
    </section>
  );
}

export function cleanQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (!value || key === "error" || key === "notice") continue;
    params.set(key, value);
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
