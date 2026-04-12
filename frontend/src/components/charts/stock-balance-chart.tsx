"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function StockBalanceChart({
  data,
}: {
  data: { code: string; inward_total: number; issued_total: number; current_stock: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
          <XAxis dataKey="code" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="inward_total" fill="#93c5fd" radius={[8, 8, 0, 0]} name="Inward" />
          <Bar dataKey="issued_total" fill="#fca5a5" radius={[8, 8, 0, 0]} name="Issued" />
          <Bar dataKey="current_stock" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Current" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
