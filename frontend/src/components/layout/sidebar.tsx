"use client";

import Image from "next/image";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarRange,
  ClipboardList,
  Factory,
  FileBarChart2,
  LayoutDashboard,
  Package2,
  Receipt,
  ScanLine,
  Settings2,
  ShoppingBag,
  ShieldCheck,
  UserCog,
  Users,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";
import { Role } from "@/types/api";
import logoImage from "./lg.png";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const ADMIN_AND_SUPERVISOR: Role[] = ["admin", "supervisor", "production_supervisor"];

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: [
          "admin",
          "store_manager",
          "production_supervisor",
          "quality_inspector",
          "planner",
          "supervisor",
          "viewer",
        ],
      },
      {
        label: "Orders",
        href: "/orders",
        icon: ShoppingBag,
        roles: ["admin", "production_supervisor", "quality_inspector", "planner", "supervisor", "viewer"],
      },
      {
        label: "Production Entries",
        href: "/production-entries",
        icon: Package2,
        roles: ADMIN_AND_SUPERVISOR,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Materials", href: "/materials", icon: Warehouse, roles: ["admin", "store_manager"] },
      {
        label: "Material Inward",
        href: "/material-inward",
        icon: Receipt,
        roles: ["admin", "store_manager"],
      },
      {
        label: "Material Issues",
        href: "/material-issues",
        icon: ScanLine,
        roles: ["admin", "store_manager", "production_supervisor", "supervisor"],
      },
      {
        label: "Stock Adjustments",
        href: "/stock-adjustments",
        icon: Wrench,
        roles: ["admin", "store_manager"],
      },
      {
        label: "Stock Summary",
        href: "/inventory/stock-summary",
        icon: ClipboardList,
        roles: ["admin", "store_manager", "viewer"],
      },
      {
        label: "Consumption Variance",
        href: "/inventory/consumption-variance",
        icon: AlertTriangle,
        roles: ["admin", "store_manager", "production_supervisor", "supervisor", "viewer"],
      },
    ],
  },
  {
    title: "Workforce",
    items: [
      {
        label: "Workers",
        href: "/workers",
        icon: Users,
        roles: ["admin", "production_supervisor", "supervisor"],
      },
      {
        label: "Worker Productivity",
        href: "/worker-productivity",
        icon: BadgeCheck,
        roles: ["admin", "production_supervisor", "supervisor"],
      },
      {
        label: "Productivity Summary",
        href: "/worker-productivity/summary",
        icon: FileBarChart2,
        roles: ["admin", "production_supervisor", "supervisor", "viewer"],
      },
    ],
  },
  {
    title: "Quality",
    items: [
      {
        label: "Defect Types",
        href: "/defect-types",
        icon: Settings2,
        roles: ["admin", "quality_inspector"],
      },
      {
        label: "Quality Inspections",
        href: "/quality-inspections",
        icon: ShieldCheck,
        roles: ["admin", "quality_inspector"],
      },
      {
        label: "Quality Summary",
        href: "/quality/summary",
        icon: FileBarChart2,
        roles: ["admin", "quality_inspector", "viewer"],
      },
    ],
  },
  {
    title: "Planning",
    items: [
      {
        label: "Production Plans",
        href: "/production-plans",
        icon: CalendarRange,
        roles: ["admin", "planner", "production_supervisor", "supervisor"],
      },
      {
        label: "Planning Calendar",
        href: "/production-plans/calendar",
        icon: CalendarRange,
        roles: ["admin", "planner", "production_supervisor", "supervisor", "viewer"],
      },
      {
        label: "Planned vs Actual",
        href: "/production-plans/planned-vs-actual",
        icon: FileBarChart2,
        roles: ["admin", "planner", "production_supervisor", "supervisor", "viewer"],
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Reports Hub",
        href: "/reports/production",
        icon: FileBarChart2,
        roles: [
          "admin",
          "store_manager",
          "production_supervisor",
          "quality_inspector",
          "planner",
          "supervisor",
          "viewer",
        ],
      },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Buyers", href: "/buyers", icon: Users, roles: ["admin"] },
      { label: "Lines", href: "/lines", icon: Factory, roles: ["admin"] },
      { label: "Users", href: "/users", icon: UserCog, roles: ["admin"] },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Profile",
        href: "/profile",
        icon: Users,
        roles: [
          "admin",
          "store_manager",
          "production_supervisor",
          "quality_inspector",
          "planner",
          "supervisor",
          "viewer",
        ],
      },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden px-4 py-5 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none",
        isDark
          ? "border-r border-[#263a61] bg-[linear-gradient(180deg,#0a1730_0%,#0b2142_48%,#0a2848_100%)] text-slate-100 shadow-[0_24px_48px_rgba(2,8,23,0.46)]"
          : "border-r border-[#d5e1f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(241,247,255,0.86)_100%)] text-slate-800 shadow-[0_20px_42px_rgba(51,78,132,0.16)]",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -left-14 top-14 h-44 w-44 rounded-full blur-3xl",
          isDark ? "bg-blue-500/30" : "bg-blue-300/25",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -right-14 bottom-24 h-48 w-48 rounded-full blur-3xl",
          isDark ? "bg-cyan-500/28" : "bg-cyan-300/30",
        )}
      />

      <div className="relative mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-2xl p-1 backdrop-blur",
              isDark
                ? "border border-white/15 bg-white/10 shadow-[0_10px_24px_rgba(15,23,42,0.45)]"
                : "border border-white/70 bg-white/85 shadow-[0_10px_24px_rgba(37,99,235,0.2)]",
            )}
          >
            <Image src={logoImage} alt="Digital Factory Logo" width={54} height={54} priority />
          </div>
          <div>
            <p className={cn("text-sm font-semibold tracking-[0.01em]", isDark ? "text-white" : "text-slate-900")}>
              Digital Factory
            </p>
            <p className={cn("text-[11px] uppercase tracking-[0.12em]", isDark ? "text-blue-200/80" : "text-slate-500")}>
              Management Suite
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          className={cn(
            "lg:hidden",
            isDark ? "text-blue-100 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-blue-50 hover:text-slate-900",
          )}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative space-y-5 overflow-y-auto pb-3">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => (user ? item.roles.includes(user.role) : false));
          if (!visibleItems.length) return null;

          return (
            <div key={section.title}>
              <p
                className={cn(
                  "mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em]",
                  isDark ? "text-blue-200/70" : "text-slate-500",
                )}
              >
                {section.title}
              </p>
              <nav className="space-y-1.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium tracking-[0.01em] transition duration-200",
                        isActive
                          ? "bg-[linear-gradient(140deg,#1d4ed8_0%,#06b6d4_58%,#14b8a6_100%)] text-white shadow-[0_12px_26px_rgba(14,116,144,0.34)]"
                          : isDark
                            ? "text-blue-100/85 hover:bg-white/12 hover:text-white"
                            : "text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-[0_8px_18px_rgba(30,64,175,0.1)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition",
                          isActive
                            ? "text-white"
                            : isDark
                              ? "text-blue-200/80 group-hover:text-cyan-200"
                              : "text-slate-500 group-hover:text-blue-600",
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="relative mt-auto pt-4">
        <div
          className={cn(
            "rounded-2xl px-3 py-3 text-xs backdrop-blur",
            isDark
              ? "border border-white/15 bg-white/10 text-blue-100/85 shadow-[0_12px_24px_rgba(2,8,23,0.34)]"
              : "border border-[#d7e3f6] bg-white/80 text-slate-600 shadow-[0_10px_22px_rgba(30,64,175,0.1)]",
          )}
        >
          <p className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>{user?.username || "User"}</p>
          <p className={cn("mt-1 capitalize", isDark ? "text-blue-200/75" : "text-slate-500")}>
            {(user?.role || "-").replaceAll("_", " ")}
          </p>
        </div>
      </div>
    </aside>
  );
}
