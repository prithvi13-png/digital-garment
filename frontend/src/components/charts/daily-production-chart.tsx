"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DailyProductionChart({
  data,
}: {
  data: { date: string; produced_qty: number; rejected_qty: number }[];
}) {
  const chartData = data.map((item) => ({
    ...item,
    label: format(new Date(item.date), "dd MMM"),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="produced_qty" stroke="#2563eb" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="rejected_qty" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
