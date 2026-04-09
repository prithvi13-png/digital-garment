import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[0_6px_16px_rgba(37,99,235,0.28)] hover:from-blue-500 hover:to-blue-600":
            variant === "primary",
          "bg-white text-slate-700 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50 hover:ring-slate-300":
            variant === "secondary",
          "bg-transparent text-slate-600 hover:bg-slate-100/90": variant === "ghost",
          "bg-gradient-to-b from-red-600 to-red-700 text-white shadow-[0_6px_16px_rgba(220,38,38,0.24)] hover:from-red-500 hover:to-red-600":
            variant === "danger",
        },
        className,
      )}
      {...props}
    />
  );
}
