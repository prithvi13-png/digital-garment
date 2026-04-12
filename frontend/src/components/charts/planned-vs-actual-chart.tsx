"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PlannedVsActualChart({
  data,
}: {
  data: { label: string; planned_total_qty: number; actual_total_qty: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="planned_total_qty" fill="#93c5fd" radius={[8, 8, 0, 0]} name="Planned" />
          <Bar dataKey="actual_total_qty" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Actual" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
