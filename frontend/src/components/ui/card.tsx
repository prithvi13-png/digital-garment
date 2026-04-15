import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "premium-panel animate-fade-rise rounded-3xl p-5 md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
