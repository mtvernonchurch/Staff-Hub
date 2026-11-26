export type DockTab = {
  href: string;
  label: string;
  /** Extra paths that light this tab. Matched exactly, or with a trailing slash, so /meeting does not swallow /meetings. */
  also?: readonly string[];
};

export const DOCK_TABS: readonly DockTab[] = [
  { href: "/", label: "Home" },
  { href: "/action-items", label: "Tasks" },
  { href: "/this-week", label: "Calendar" },
  { href: "/meetings", label: "Meetings", also: ["/meeting"] },
  { href: "/requests", label: "Requests" },
  { href: "/documents", label: "Resources" },
];

export function dockActive(path: string, tab: DockTab): boolean {
  if (tab.href === "/") return path === "/";
  if (path === tab.href || path.startsWith(`${tab.href}/`)) return true;
  return (tab.also ?? []).some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
