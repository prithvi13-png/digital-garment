import type { Metadata } from "next";

import { Providers } from "@/lib/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Factory Management System",
  description: "Production visibility and order management for garment factories",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
