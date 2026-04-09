"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/buyers")) return "Buyers";
  if (pathname.startsWith("/lines")) return "Production Lines";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/production-entries")) return "Production Entries";
  if (pathname.startsWith("/reports/production")) return "Production Report";
  if (pathname.startsWith("/reports/orders")) return "Orders Report";
  if (pathname.startsWith("/users")) return "Users";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Digital Factory";
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-lg sm:px-4 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{getPageTitle(pathname)}</h1>
            <p className="text-xs text-slate-500">Factory operations at a glance</p>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
          <div className="max-w-[180px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 sm:max-w-none">
            <p className="font-semibold text-slate-800">{user ? ROLE_LABELS[user.role] : "-"}</p>
            <p className="truncate">{user?.username}</p>
          </div>
          <Button variant="secondary" onClick={signOut}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
