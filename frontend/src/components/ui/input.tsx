import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-[#d6e2f3] bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)] outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
