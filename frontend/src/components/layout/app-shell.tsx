"use client";

import { ReactNode, useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="premium-grid-backdrop relative flex min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute -left-28 -top-24 h-72 w-72 rounded-full bg-blue-300/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl" />
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-3 py-5 sm:px-4 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
