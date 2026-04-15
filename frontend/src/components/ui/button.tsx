import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold tracking-[0.01em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/55 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-[linear-gradient(140deg,#1d4ed8_0%,#0ea5e9_55%,#0f766e_100%)] text-white shadow-[0_14px_26px_-14px_rgba(15,23,42,0.85),0_10px_24px_rgba(14,116,144,0.34)] hover:-translate-y-0.5 hover:brightness-105":
            variant === "primary",
          "border border-[#d3dff2] bg-white/90 text-slate-700 shadow-[0_6px_20px_rgba(30,64,175,0.08)] backdrop-blur hover:border-blue-200 hover:bg-white":
            variant === "secondary",
          "bg-transparent text-slate-600 hover:bg-[#edf4ff] hover:text-slate-900": variant === "ghost",
          "bg-[linear-gradient(135deg,#dc2626_0%,#ef4444_65%,#f97316_100%)] text-white shadow-[0_12px_22px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 hover:brightness-105":
            variant === "danger",
        },
        className,
      )}
      {...props}
    />
  );
}
