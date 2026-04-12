import { ReactNode } from "react";

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <table className="min-w-full text-[13px] sm:text-sm [&_td]:align-middle [&_td]:px-4 [&_td]:py-3 [&_td]:text-slate-700 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:tracking-wide [&_tr]:border-b [&_tr]:border-slate-100 [&_tbody_tr:nth-child(even)]:bg-slate-50/40 [&_tbody_tr:hover]:bg-blue-50/35">
        {children}
      </table>
    </div>
  );
}
