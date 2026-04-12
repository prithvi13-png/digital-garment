"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function QualityTrendChart({
  data,
}: {
  data: { date: string; defect_rate: number; rejection_rate: number }[];
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
          <Line type="monotone" dataKey="defect_rate" stroke="#f59e0b" strokeWidth={2.3} dot={false} name="Defect %" />
          <Line type="monotone" dataKey="rejection_rate" stroke="#dc2626" strokeWidth={2.3} dot={false} name="Rejection %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
