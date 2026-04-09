import { TextareaHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-[inset_0_1px_1px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/25",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
