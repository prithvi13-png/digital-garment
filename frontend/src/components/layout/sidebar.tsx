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

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white/95 px-4 py-5 shadow-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl ">
            <Image src={logoImage} alt="Digital Factory Logo" width={60} height={60} priority />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Digital Factory</p>
            <p className="text-xs text-slate-500">Management System</p>
          </div>
        </div>

        <Button variant="ghost" className="lg:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-5 overflow-y-auto pb-3">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => (user ? item.roles.includes(user.role) : false));
          if (!visibleItems.length) return null;

          return (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
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
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-[0_10px_24px_rgba(13,148,136,0.22)]"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">{user?.username || "User"}</p>
          <p className="mt-1 capitalize">{(user?.role || "-").replaceAll("_", " ")}</p>
        </div>
      </div>
    </aside>
  );
}
