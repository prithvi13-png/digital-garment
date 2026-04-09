import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_30px_rgba(15,23,42,0.06)] md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
