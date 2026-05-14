"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * A dedicated component for the usage chart to allow for dynamic loading.
 */
export default function UsageChart({ chartData, viewMode, fmt, fmtCost }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={viewMode === "tokens" ? "#6366f1" : "#f59e0b"} stopOpacity={0.3} />
            <stop offset="95%" stopColor={viewMode === "tokens" ? "#6366f1" : "#f59e0b"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5, fontWeight: "bold" }}
          dy={15}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5, fontWeight: "bold" }}
          tickFormatter={viewMode === "tokens" ? fmt : fmtCost}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(var(--bg), 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(var(--primary), 0.1)",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            padding: "12px"
          }}
          itemStyle={{ fontSize: "14px", fontWeight: "700" }}
          labelStyle={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "600" }}
          formatter={(value: any) => [viewMode === "tokens" ? fmt(value) : fmtCost(value), viewMode.charAt(0).toUpperCase() + viewMode.slice(1)]}
        />
        <Area
          type="monotone"
          dataKey={viewMode === "tokens" ? "tokens" : "cost"}
          stroke={viewMode === "tokens" ? "#4f46e5" : "#d97706"}
          strokeWidth={4}
          fillOpacity={1}
          fill="url(#colorValue)"
          animationDuration={1500}
          activeDot={{ r: 6, strokeWidth: 0, fill: viewMode === "tokens" ? "#4f46e5" : "#d97706" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
