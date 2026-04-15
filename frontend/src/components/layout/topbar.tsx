"use client";

import { Menu, MoonStar, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { useTheme } from "@/lib/theme-provider";

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/buyers")) return "Buyers";
  if (pathname.startsWith("/lines")) return "Production Lines";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/production-entries")) return "Production Entries";

  if (pathname.startsWith("/materials/")) return "Material Details";
  if (pathname.startsWith("/materials")) return "Materials";
  if (pathname.startsWith("/material-inward")) return "Material Inward";
  if (pathname.startsWith("/material-issues")) return "Material Issues";
  if (pathname.startsWith("/stock-adjustments")) return "Stock Adjustments";
  if (pathname.startsWith("/inventory/stock-summary")) return "Stock Summary";
  if (pathname.startsWith("/inventory/consumption-variance")) return "Consumption Variance";

  if (pathname.startsWith("/workers/")) return "Worker Details";
  if (pathname.startsWith("/workers")) return "Workers";
  if (pathname.startsWith("/worker-productivity/summary")) return "Productivity Summary";
  if (pathname.startsWith("/worker-productivity")) return "Worker Productivity";

  if (pathname.startsWith("/defect-types")) return "Defect Types";
  if (pathname.startsWith("/quality-inspections/")) return "Inspection Details";
  if (pathname.startsWith("/quality-inspections")) return "Quality Inspections";
  if (pathname.startsWith("/quality/summary")) return "Quality Summary";

  if (pathname.startsWith("/production-plans/calendar")) return "Planning Calendar";
  if (pathname.startsWith("/production-plans/planned-vs-actual")) return "Planned vs Actual";
  if (pathname.startsWith("/production-plans")) return "Production Plans";

  if (pathname.startsWith("/reports/production")) return "Production Report";
  if (pathname.startsWith("/reports/orders")) return "Orders Report";
  if (pathname.startsWith("/reports/inventory")) return "Inventory Report";
  if (pathname.startsWith("/reports/consumption")) return "Consumption Report";
  if (pathname.startsWith("/reports/productivity")) return "Productivity Report";
  if (pathname.startsWith("/reports/quality")) return "Quality Report";
  if (pathname.startsWith("/reports/planning")) return "Planning Report";

  if (pathname.startsWith("/users")) return "Users";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Digital Factory";
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 px-3 py-3 sm:px-4 lg:px-8">
      <div className="premium-panel rounded-3xl px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="lg:hidden" onClick={onMenuClick}>
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{getPageTitle(pathname)}</h1>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Factory command center</p>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
            <Button
              variant="secondary"
              onClick={toggleTheme}
              className="min-w-10 px-3"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            </Button>

            <div className="max-w-[220px] rounded-2xl border border-[#d7e3f6] bg-gradient-to-br from-white to-slate-50 px-3 py-2 text-xs text-slate-700 shadow-[0_8px_20px_rgba(30,64,175,0.09)] sm:max-w-none">
              <p className="font-semibold tracking-[0.01em] text-slate-800">{user ? ROLE_LABELS[user.role] : "-"}</p>
              <p className="truncate text-slate-500">{user?.username}</p>
            </div>
            <Button variant="secondary" onClick={signOut}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
