import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "MV Staff Hub", template: "%s · MV Staff Hub" },
  description: "The staff home for Mt Vernon Church in Columbus, Mississippi.",
  applicationName: "MV Staff Hub",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Staff Hub", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#04354b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body style={{ fontFamily: "var(--font-body), Figtree, sans-serif" }}>{children}</body>
    </html>
  );
}
