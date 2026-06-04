"use client";

import React from "react";
import { DashboardMetrics } from "@/lib/api/traces";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
}

const fmt = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const fmtSec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n));

const creditsConfig: ChartConfig = {
  credits: { label: "Credits", color: "#3C67EA" },
};

const latencyConfig: ChartConfig = {
  avg: { label: "Avg Latency", color: "#14A687" },
  p95: { label: "P95 Latency", color: "#485478" },
};

const errorConfig: ChartConfig = {
  error_rate: { label: "Error Rate", color: "#DB3743" },
};

const tokenConfig: ChartConfig = {
  input:  { label: "Input Tokens",  color: "#3C67EA" },
  output: { label: "Output Tokens", color: "#6C96F4" },
};

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#e6ebf8] rounded-[4px] p-4 shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex flex-col gap-3">
      <div>
        <h3 className="text-[0.875rem] leading-[1.2] font-black text-[#242d48]">{title}</h3>
        <p className="text-[0.75rem] font-semibold text-[#485478] mt-0.5">{subtitle}</p>
      </div>
      <div className="h-[200px]">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="w-full h-full flex items-center justify-center text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478]">
      No data for this period
    </div>
  );
}

export function TraceAnalyticsCharts({ metrics, isLoading }: Props) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#e6ebf8] rounded-[4px] p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
            <div className="flex-1 flex flex-col gap-2 pt-2">
              <div className="flex items-end gap-1 h-[160px]">
                {[60, 40, 75, 55, 80, 45, 70, 50, 85, 65].map((h, j) => (
                  <Skeleton
                    key={j}
                    className="flex-1 rounded-[2px]"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-3 w-10 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const daily = metrics.daily_metrics ?? [];

  const creditsData = daily.map((d) => ({
    date: d.date,
    credits: Math.round(d.credits_consumed * 10000) / 10000,
  }));

  const latencyData = daily.map((d) => ({
    date: d.date,
    avg: d.avg_latency_ms,
    p95: d.p95_latency_ms ?? undefined,
  }));
  const hasP95 = latencyData.some((d) => d.p95 != null);

  const errorData = daily.map((d) => ({
    date: d.date,
    error_rate:
      d.total_traces > 0
        ? Math.round((d.error_count / d.total_traces) * 1000) / 10
        : 0,
  }));

  const tokenData = daily.map((d) => ({
    date: d.date,
    input: d.input_tokens ?? d.total_tokens,
    output: d.output_tokens ?? 0,
  }));
  const hasSplit = daily.some((d) => d.input_tokens != null);

  const xAxisProps = {
    dataKey: "date" as const,
    tickLine: false,
    axisLine: false,
    tickMargin: 10,
    minTickGap: 40,
    tick: {
      fontSize: 11,
      fill: "var(--muted-foreground)",
      fontWeight: 600 as const,
    },
    tickFormatter: fmt,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ChartCard title="Credits Consumed" subtitle="Daily credit usage trend">
        {creditsData.length ? (
          <ChartContainer config={creditsConfig} className="w-full h-full">
            <LineChart data={creditsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis {...xAxisProps} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 600 }}
                width={40}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line
                dataKey="credits"
                type="monotone"
                stroke="var(--color-credits)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <EmptyState />
        )}
      </ChartCard>

      <ChartCard
        title="Latency Trends"
        subtitle="Average and P95 latency over time (seconds)"
      >
        {latencyData.length ? (
          <ChartContainer config={latencyConfig} className="w-full h-full">
            <LineChart data={latencyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis {...xAxisProps} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 600 }}
                width={40}
                tickFormatter={fmtSec}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent formatter={(v) => fmtSec(Number(v))} />
                }
              />
              <Line
                dataKey="avg"
                type="monotone"
                stroke="var(--color-avg)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {hasP95 && (
                <Line
                  dataKey="p95"
                  type="monotone"
                  stroke="var(--color-p95)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ChartContainer>
        ) : (
          <EmptyState />
        )}
      </ChartCard>

      <ChartCard title="Error Rate" subtitle="Error rate percentage over time">
        {errorData.length ? (
          <ChartContainer config={errorConfig} className="w-full h-full">
            <LineChart data={errorData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis {...xAxisProps} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 600 }}
                width={44}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent formatter={(v) => `${Number(v)}%`} />
                }
              />
              <Line
                dataKey="error_rate"
                type="monotone"
                stroke="var(--color-error_rate)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <EmptyState />
        )}
      </ChartCard>

      <ChartCard
        title="Token Usage"
        subtitle={
          hasSplit
            ? "Input and output tokens over time"
            : "Total tokens over time"
        }
      >
        {tokenData.length ? (
          <ChartContainer config={tokenConfig} className="w-full h-full">
            <LineChart data={tokenData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis {...xAxisProps} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 600 }}
                width={44}
                tickFormatter={fmtK}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(v) => Number(v).toLocaleString()}
                  />
                }
              />
              <Line
                dataKey="input"
                type="monotone"
                stroke="var(--color-input)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {hasSplit && (
                <Line
                  dataKey="output"
                  type="monotone"
                  stroke="var(--color-output)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ChartContainer>
        ) : (
          <EmptyState />
        )}
      </ChartCard>
    </div>
  );
}
