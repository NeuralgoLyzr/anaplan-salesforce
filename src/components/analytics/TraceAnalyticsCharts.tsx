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

const fmt    = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtSec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const fmtK   = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

const creditsConfig: ChartConfig = { credits:    { label: "Credits",       color: "#3C67EA" } };
const latencyConfig: ChartConfig = { avg:        { label: "Avg Latency",   color: "#14A687" }, p95: { label: "P95 Latency", color: "#485478" } };
const errorConfig:   ChartConfig = { error_rate: { label: "Error Rate",    color: "#DB3743" } };
const tokenConfig:   ChartConfig = { input:      { label: "Input Tokens",  color: "#3C67EA" }, output: { label: "Output Tokens", color: "#6C96F4" } };

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e6ebf8] rounded-[4px] p-4 shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex flex-col gap-3">
      <div>
        <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{title}</h3>
        <p className="text-[0.75rem] font-medium text-[#485478] mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white border border-[#e6ebf8] rounded-[4px] p-4 shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-32 rounded-[4px]" />
        <Skeleton className="h-3 w-48 rounded-[4px]" />
      </div>
      <Skeleton className="h-[120px] w-full rounded-[4px]" />
    </div>
  );
}

export function TraceAnalyticsCharts({ metrics, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonChart key={i} />)}
      </div>
    );
  }

  if (!metrics || !metrics.daily_metrics?.length) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["Credits Consumed","Latency Trends","Error Rate","Token Usage"].map((t) => (
          <ChartCard key={t} title={t} subtitle="No data available for this period.">
            <div className="flex items-center justify-center h-[120px] text-[0.75rem] font-medium text-[#909cc0]">
              No data
            </div>
          </ChartCard>
        ))}
      </div>
    );
  }

  const daily = metrics.daily_metrics;

  const creditsData = daily.map((d) => ({ date: d.date, credits: d.credits_consumed }));
  const latencyData = daily.map((d) => ({ date: d.date, avg: d.avg_latency_ms / 1000, p95: (d.p95_latency_ms ?? 0) / 1000 }));
  const errorData   = daily.map((d) => ({
    date: d.date,
    error_rate: d.total_traces > 0 ? Math.round((d.error_count / d.total_traces) * 100) : 0,
  }));
  const tokenData = daily.map((d) => ({
    date:   d.date,
    input:  d.input_tokens  ?? Math.round(d.total_tokens * 0.6),
    output: d.output_tokens ?? Math.round(d.total_tokens * 0.4),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Credits Consumed */}
      <ChartCard title="Credits Consumed" subtitle="Daily credit usage trend">
        <ChartContainer config={creditsConfig} className="h-[120px] w-full">
          <LineChart data={creditsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf8" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="credits" stroke="#3C67EA" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      {/* Latency Trends */}
      <ChartCard title="Latency Trends" subtitle="Average and P95 latency over time (seconds)">
        <ChartContainer config={latencyConfig} className="h-[120px] w-full">
          <LineChart data={latencyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf8" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtSec} tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="avg" stroke="#14A687" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="p95" stroke="#485478" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      {/* Error Rate */}
      <ChartCard title="Error Rate" subtitle="Error rate percentage over time">
        <ChartContainer config={errorConfig} className="h-[120px] w-full">
          <LineChart data={errorData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf8" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="error_rate" stroke="#DB3743" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      {/* Token Usage */}
      <ChartCard title="Token Usage" subtitle="Input and output tokens over time">
        <ChartContainer config={tokenConfig} className="h-[120px] w-full">
          <LineChart data={tokenData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf8" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#485478" }} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="input"  stroke="#3C67EA" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="output" stroke="#6C96F4" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}
