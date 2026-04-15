import { ReactNode } from "react";

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="premium-panel overflow-x-auto rounded-3xl">
      <table className="min-w-full text-[13px] sm:text-sm [&_td]:align-middle [&_td]:px-4 [&_td]:py-3 [&_td]:text-slate-700 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[#d4e0f3] [&_th]:bg-[linear-gradient(180deg,#f8fbff_0%,#edf4fe_100%)] [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:tracking-wide [&_tr]:border-b [&_tr]:border-[#e4ecfa] [&_tbody_tr:nth-child(even)]:bg-[#f8fbff]/90 [&_tbody_tr:hover]:bg-[#e9f3ff]/80">
        {children}
      </table>
    </div>
  );
}
