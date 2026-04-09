import { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 p-8 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
