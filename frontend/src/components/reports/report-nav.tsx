"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

const REPORT_LINKS = [
  { href: "/reports/production", label: "Production" },
  { href: "/reports/orders", label: "Orders" },
  { href: "/reports/inventory", label: "Inventory" },
  { href: "/reports/consumption", label: "Consumption" },
  { href: "/reports/productivity", label: "Productivity" },
  { href: "/reports/quality", label: "Quality" },
  { href: "/reports/planning", label: "Planning" },
] as const;

export function ReportNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {REPORT_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link key={link.href} href={link.href}>
            <Button variant={active ? "primary" : "secondary"}>{link.label}</Button>
          </Link>
        );
      })}
    </div>
  );
}
