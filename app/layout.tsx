import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
