"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EfficiencyChart({ data }: { data: { label: string; efficiency: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} domain={[0, 120]} />
          <Tooltip />
          <Bar dataKey="efficiency" fill="#14b8a6" radius={[8, 8, 0, 0]} name="Efficiency %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
