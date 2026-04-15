"use client";

import { Filter, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Option = {
  label: string;
  value: string;
};

export function KanbanToolbar({
  search,
  onSearchChange,
  owner,
  onOwnerChange,
  owners,
  pipeline,
  onPipelineChange,
  pipelines,
  priority,
  onPriorityChange,
  priorities,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  owner: string;
  onOwnerChange: (value: string) => void;
  owners: Option[];
  pipeline: string;
  onPipelineChange: (value: string) => void;
  pipelines: Option[];
  priority: string;
  onPriorityChange: (value: string) => void;
  priorities: Option[];
  onReset: () => void;
}) {
  return (
    <div className="premium-panel rounded-3xl p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search cards"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</label>
          <Select value={pipeline} onChange={(e) => onPipelineChange(e.target.value)}>
            <option value="">All pipelines</option>
            {pipelines.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</label>
          <Select value={owner} onChange={(e) => onOwnerChange(e.target.value)}>
            <option value="">All owners</option>
            {owners.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</label>
          <Select value={priority} onChange={(e) => onPriorityChange(e.target.value)}>
            <option value="">All priority</option>
            {priorities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Operational filters update board in real time.
        </p>
        <Button type="button" variant="secondary" onClick={onReset} className="gap-1.5">
          <Filter className="h-4 w-4" /> Reset filters
        </Button>
      </div>
    </div>
  );
}
