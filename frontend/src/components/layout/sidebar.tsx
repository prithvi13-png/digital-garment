"use client";

import { Factory, LayoutDashboard, ListChecks, Package2, Settings2, ShoppingBag, Users, UserCog, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Role } from "@/types/api";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "supervisor", "viewer"],
  },
  { label: "Buyers", href: "/buyers", icon: Users, roles: ["admin"] },
  { label: "Lines", href: "/lines", icon: Settings2, roles: ["admin"] },
  {
    label: "Orders",
    href: "/orders",
    icon: ShoppingBag,
    roles: ["admin", "supervisor", "viewer"],
  },
  {
    label: "Production Entries",
    href: "/production-entries",
    icon: Package2,
    roles: ["admin", "supervisor"],
  },
  {
    label: "Reports",
    href: "/reports/production",
    icon: ListChecks,
    roles: ["admin", "supervisor", "viewer"],
  },
  { label: "Users", href: "/users", icon: UserCog, roles: ["admin"] },
  {
    label: "Profile",
    href: "/profile",
    icon: Users,
    roles: ["admin", "supervisor", "viewer"],
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
          <div className="rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 p-2 text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)]">
            <Factory className="h-5 w-5" />
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

      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Navigation</p>
      <nav className="space-y-1.5">
        {NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false)).map((item) => {
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

      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">{user?.username || "User"}</p>
          <p className="mt-1 capitalize">{user?.role || "-"}</p>
        </div>
      </div>
    </aside>
  );
}
