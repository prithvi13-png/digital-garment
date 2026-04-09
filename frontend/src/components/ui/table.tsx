import { ReactNode } from "react";

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <table className="min-w-full divide-y divide-slate-100 text-[13px] sm:text-sm [&_td]:align-middle [&_td]:whitespace-nowrap [&_td]:px-4 [&_td]:py-3 [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:tracking-wide">
        {children}
      </table>
    </div>
  );
}
