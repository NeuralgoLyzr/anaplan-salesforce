"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Distinct colors for stacked product bars. Loops if there are more products.
const PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#0ea5e9", // sky
  "#a855f7", // violet
  "#14b8a6", // teal
  "#f43f5e", // rose
];

interface Props {
  data: Record<string, number | string>[];
  products: string[];
  currency?: string | null;
}

function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function MonthlyProjectionChart({ data, products, currency }: Props) {
  if (!data || data.length === 0 || products.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">No monthly projection returned by Pricing.</p>
    );
  }

  const currencyPrefix = currency ? `${currency} ` : "";

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => compactNumber(Number(v))}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--primary) / 0.05)" }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
            }}
            formatter={(value: number | string, name: string) => [
              `${currencyPrefix}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          {products.map((p, i) => (
            <Bar
              key={p}
              dataKey={p}
              stackId="revenue"
              fill={PALETTE[i % PALETTE.length]}
              radius={i === products.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
