import type { LucideIcon } from "lucide-react";

const sizes = { h1: 26, h2: 18, h3: 16 } as const;

export function Heading({
  as = "h2",
  icon: Icon,
  children,
  className,
}: {
  as?: "h1" | "h2" | "h3";
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag className={className ? `with-icon ${className}` : "with-icon"}>
      <Icon aria-hidden size={sizes[as]} strokeWidth={2} />
      <span>{children}</span>
    </Tag>
  );
}
