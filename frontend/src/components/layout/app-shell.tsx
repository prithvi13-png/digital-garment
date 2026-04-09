"use client";

import { ReactNode, useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-3 py-5 sm:px-4 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
