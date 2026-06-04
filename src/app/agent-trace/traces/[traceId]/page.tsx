"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getTraceGantt,
  getTraceSummary,
  GanttChartData,
  TraceSummary,
} from "@/lib/api/traces";
import { Bot, Link as LinkIcon, Cpu, Wrench, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

function getModelLogo(modelName: string) {
  const normalized = modelName.toLowerCase();
  if (normalized.includes("gpt") || normalized.includes("openai"))
    return "/logos/chatgpt-logo.jpg";
  if (normalized.includes("claude") || normalized.includes("anthropic"))
    return "/logos/anthropic.svg";
  if (normalized.includes("gemini") || normalized.includes("google"))
    return "/logos/gemini.svg";
  if (normalized.includes("grok") || normalized.includes("xai"))
    return "/logos/xai.svg";
  if (normalized.includes("llama") || normalized.includes("meta"))
    return "/logos/meta.svg";
  if (normalized.includes("mistral") || normalized.includes("mixtral"))
    return "/logos/mistral.svg";
  return null;
}

export default function TraceDetailPage() {
  const params = useParams();
  const traceId = params.traceId as string;
  const router = useRouter();

  const [data, setData] = useState<GanttChartData | null>(null);
  const [summary, setSummary] = useState<TraceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrace() {
      setIsLoading(true);
      setError(null);
      // Clear stale gantt/summary cache
      if (typeof window !== "undefined") {
        Object.keys(localStorage)
          .filter(
            (k) =>
              k.startsWith("lyzr_cache_gantt") ||
              k.startsWith("lyzr_cache_summary")
          )
          .forEach((k) => localStorage.removeItem(k));
      }
      try {
        const [gantt, sum] = await Promise.allSettled([
          getTraceGantt(traceId),
          getTraceSummary(traceId),
        ]);
        if (gantt.status === "fulfilled") setData(gantt.value);
        else setError((gantt.reason as Error).message || "Failed to load trace");
        if (sum.status === "fulfilled") setSummary(sum.value);
      } finally {
        setIsLoading(false);
      }
    }
    loadTrace();
  }, [traceId]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col pt-6 pb-20 px-8 gap-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 border-b border-[#e6ebf8] pb-6">
          <Skeleton className="w-36 h-7 rounded-[4px]" />
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Skeleton className="w-20 h-5 rounded-[4px]" />
                <Skeleton className="w-32 h-5 rounded-[4px]" />
              </div>
              <Skeleton className="w-64 h-8 rounded-[4px]" />
              <Skeleton className="w-48 h-6 rounded-[4px]" />
            </div>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="w-[100px] h-[68px] rounded-[4px]" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-[4px]" />
          <Skeleton className="h-32 rounded-[4px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[320px] rounded-[4px]" />
          <Skeleton className="h-[320px] rounded-[4px]" />
        </div>
        <Skeleton className="h-[400px] rounded-[4px] flex-1" />
      </div>
    );
  }

  if (error && !data && !summary) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="bg-white text-[#db3743] p-6 rounded-[4px] border border-[#f2919d] shadow-[0_2px_4px_rgba(36,45,72,0.15)] text-center max-w-md">
          <h2 className="text-[1rem] leading-[1.2] font-black mb-2">Error Loading Trace</h2>
          <p className="text-[0.875rem] leading-[1.2] font-semibold mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-[2px] text-[0.875rem] font-semibold text-[#3c67ea] shadow-[inset_0_0_0_1px_#3c67ea] hover:bg-[#f0f1f7] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const spans = data?.spans ?? [];
  const hasSpans = spans.length > 0;
  const resolvedTraceId = data?.trace_id ?? summary?.trace_id ?? traceId;

  const minTime = hasSpans
    ? Math.min(...spans.map((s) => new Date(s.start_time).getTime()))
    : 0;
  const maxTime = hasSpans
    ? Math.max(...spans.map((s) => new Date(s.end_time).getTime()))
    : 0;
  const totalDuration = maxTime - minTime;

  let totalLlmTime = 0,
    totalToolTime = 0,
    totalAgentTime = 0;
  const spanTokenData: { name: string; tokens: number }[] = [];

  spans.forEach((span) => {
    const dur =
      new Date(span.end_time).getTime() - new Date(span.start_time).getTime();
    if (span.type === "llm") totalLlmTime += dur;
    else if (span.type === "tool") totalToolTime += dur;
    else totalAgentTime += dur;

    if (span.metadata?.tokens) {
      spanTokenData.push({
        name:
          (span.name ?? "").substring(0, 15) +
          ((span.name?.length ?? 0) > 15 ? "..." : ""),
        tokens: span.metadata.tokens,
      });
    }
  });

  const tokenData: { name: string; tokens: number }[] =
    spanTokenData.length > 0
      ? spanTokenData
      : [
          { name: "Input", tokens: summary?.input_tokens ?? 0 },
          { name: "Output", tokens: summary?.output_tokens ?? 0 },
        ].filter((d) => d.tokens > 0);

  const durationPieData = [
    { name: "LLM Processing", value: totalLlmTime },
    { name: "Tool Execution", value: totalToolTime },
    { name: "Agent Overhead", value: totalAgentTime },
  ].filter((d) => d.value > 0);

  const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f97316"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getIcon = (span: any) => {
    if (span.type === "llm") {
      const modelName = span.metadata?.model || summary?.model;
      if (modelName) {
        const logo = getModelLogo(modelName);
        if (logo) {
          return (
            <Image
              src={logo}
              alt="Model"
              width={14}
              height={14}
              className="brightness-0 invert opacity-90"
            />
          );
        }
      }
      return <Cpu className="w-3.5 h-3.5" />;
    }
    switch (span.type) {
      case "agent":
        return <Bot className="w-3.5 h-3.5" />;
      case "tool":
        return <Wrench className="w-3.5 h-3.5" />;
      case "chain":
        return <LinkIcon className="w-3.5 h-3.5" />;
      default:
        return <Cpu className="w-3.5 h-3.5" />;
    }
  };

  const getColor = (type: string, status: string) => {
    if (status === "error") return "bg-[#db3743] text-[#db3743]-foreground";
    switch (type) {
      case "agent":
        return "bg-[#3c67ea] text-white";
      case "llm":
        return "bg-[#7979d8] text-white";
      case "tool":
        return "bg-[#3c67ea] text-white";
      case "chain":
        return "bg-[#DB3743] text-white";
      default:
        return "bg-[#f0f1f7] text-[#242d48]";
    }
  };

  return (
    <div className="w-full h-full flex flex-col pt-6 pb-20 px-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#e6ebf8] pb-6">
        <Link
          href="/agent-trace"
          className="inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] hover:text-[#242d48] transition-colors tracking-[0.08em] bg-[#f0f1f7] px-3 py-1.5 rounded-[4px] border border-[#e6ebf8]/50 w-fit"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Agent Traces
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {summary?.status && (
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-[2px] text-[0.75rem] font-black uppercase tracking-[0.08em] border",
                    summary.status.toLowerCase() === "complete" ||
                      summary.status.toLowerCase() === "success"
                      ? "bg-[#14A687]/10 text-[#14A687] border-[#14A687]/20"
                      : summary.status.toLowerCase() === "error" ||
                        summary.status.toLowerCase() === "failed"
                      ? "bg-white text-[#db3743] border-[#db3743]"
                      : "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]"
                  )}
                >
                  {summary.status}
                </span>
              )}
              {summary?.agent_name && (
                <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] bg-[#f0f1f7] px-2 py-0.5 rounded-[4px] border border-[#e6ebf8]">
                  {summary.agent_name}
                </span>
              )}
            </div>

            <h1 className="text-[1.375rem] leading-[1.5] font-black text-[#242d48]">
              Trace Analysis
            </h1>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] font-mono text-[#485478] bg-[#f0f1f7] dark:bg-[#f7f8fc] px-2 py-1 rounded-[4px] border border-[#e6ebf8] w-fit">
              {resolvedTraceId}
            </p>
          </div>

          {/* Summary stats */}
          {summary && (
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {[
                {
                  label: "Duration",
                  value:
                    summary.duration_ms >= 1000
                      ? `${(summary.duration_ms / 1000).toFixed(2)}s`
                      : `${summary.duration_ms}ms`,
                },
                {
                  label: "Input Tokens",
                  value: summary.input_tokens.toLocaleString(),
                },
                {
                  label: "Output Tokens",
                  value: summary.output_tokens.toLocaleString(),
                },
                ...(summary.credits > 0
                  ? [{ label: "Credits", value: summary.credits.toFixed(4) }]
                  : []),
                ...(summary.model
                  ? [
                      {
                        label: "Model",
                        value: summary.model,
                        isModel: true,
                      },
                    ]
                  : []),
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center px-4 py-3 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex-1 min-w-[110px]"
                >
                  <span className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1 text-center">
                    {stat.label}
                  </span>
                  {stat.isModel ? (
                    <div className="flex items-center gap-1.5">
                      {getModelLogo(stat.value) && (
                        <Image
                          src={getModelLogo(stat.value)!}
                          alt="Model Logo"
                          width={14}
                          height={14}
                          className="opacity-70 dark:brightness-200 dark:contrast-0"
                        />
                      )}
                      <span className="text-[0.875rem] leading-[1.2] sm:text-[1rem] leading-[1.2] font-black text-[#242d48] text-center break-all">
                        {stat.value}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[0.875rem] leading-[1.2] sm:text-[1rem] leading-[1.2] font-black text-[#242d48] text-center break-all">
                      {stat.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input / Output */}
      {(data?.input || data?.output || summary?.input || summary?.output) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.input || summary?.input) && (
            <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex flex-col gap-3">
              <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#3c67ea] inline-block" />
                Input — User Query
              </p>
              <div className="overflow-y-auto max-h-[400px] pr-2">
                <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] whitespace-pre-wrap leading-relaxed">
                  {data?.input ?? summary?.input}
                </p>
              </div>
            </div>
          )}
          {(data?.output || summary?.output) && (
            <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex flex-col gap-3">
              <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#14A687] inline-block" />
                Output — Agent Response
              </p>
              <div className="overflow-y-auto max-h-[400px] pr-2">
                <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] whitespace-pre-wrap leading-relaxed">
                  {data?.output ?? summary?.output}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Micro Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Allocation */}
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4">
          <h3 className="text-[0.875rem] leading-[1.2] font-black text-[#242d48] mb-4">
            Time Allocation
          </h3>
          <div className="h-[250px]">
            {durationPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={durationPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {durationPieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [`${value}ms`, "Duration"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      fontWeight: 700,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[0.875rem] leading-[1.2] font-semibold text-[#485478]">
                No duration data available
              </div>
            )}
          </div>
        </div>

        {/* Token Consumption */}
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4">
          <h3 className="text-[0.875rem] leading-[1.2] font-black text-[#242d48] mb-4">
            Token Consumption
          </h3>
          <div className="h-[250px]">
            {tokenData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tokenData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                      fontWeight: 600,
                    }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      fontWeight: 700,
                    }}
                  />
                  <Bar
                    dataKey="tokens"
                    fill="var(--primary)"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[0.875rem] leading-[1.2] font-semibold text-[#485478]">
                No token metadata logged in this trace
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex-1">
        <h3 className="text-[1rem] leading-[1.2] font-black text-[#242d48] mb-6">
          Execution Critical Path (Gantt)
        </h3>

        {!hasSpans ? (
          <div className="w-full flex items-center justify-center py-16 text-[0.875rem] leading-[1.2] font-semibold text-[#485478]">
            No span data available for this trace.
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="min-w-[700px] relative">
              {/* Timeline header */}
              <div className="flex border-b border-[#e6ebf8]/50 pb-2 mb-4 relative h-6">
                <div className="absolute left-[240px] right-0 flex justify-between text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478]">
                  <span>0ms</span>
                  <span>{(totalDuration / 2).toFixed(0)}ms</span>
                  <span>{totalDuration}ms</span>
                </div>
              </div>

              {/* Spans */}
              <div className="flex flex-col gap-4 relative">
                {/* Background grid lines */}
                <div className="absolute top-0 bottom-0 left-[240px] right-0 flex justify-between pointer-events-none">
                  <div className="w-px h-full bg-[#e6ebf8]/20" />
                  <div className="w-px h-full bg-[#e6ebf8]/20" />
                  <div className="w-px h-full bg-[#e6ebf8]/20" />
                </div>

                {spans.map((span) => {
                  const startOffset =
                    new Date(span.start_time).getTime() - minTime;
                  const duration =
                    new Date(span.end_time).getTime() -
                    new Date(span.start_time).getTime();
                  const leftPercent = (startOffset / totalDuration) * 100;
                  const widthPercent = Math.max(
                    (duration / totalDuration) * 100,
                    0.5
                  );
                  const depth = span.parent_id ? 1 : 0;

                  return (
                    <div
                      key={span.id}
                      className="flex items-center group relative z-10"
                    >
                      {/* Label */}
                      <div
                        className="w-[240px] flex-shrink-0 pr-4 flex items-center gap-3"
                        style={{ paddingLeft: `${depth * 20}px` }}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-[4px]",
                            getColor(span.type, span.status)
                          )}
                        >
                          {getIcon(span)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[0.875rem] leading-[1.2] font-semibold truncate text-[#242d48]">
                            {span.name}
                          </span>
                          <span className="text-[0.75rem] font-mono text-[#485478] uppercase">
                            {span.type}
                          </span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="flex-1 relative h-10 bg-[#f0f1f7] group-hover:bg-[#dfe2eb] transition-colors rounded-[2px] flex items-center">
                        <div
                          className={cn(
                            "absolute top-2 bottom-2 rounded-[2px] shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex items-center px-3 min-w-[24px] transition-all",
                            getColor(span.type, span.status)
                          )}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                        >
                          {widthPercent > 10 && (
                            <span className="text-[0.75rem] font-semibold opacity-90 truncate mx-auto">
                              {duration}ms
                            </span>
                          )}
                        </div>

                        {/* Hover tooltip */}
                        <div className="absolute hidden group-hover:flex flex-col bg-[#485478] text-white border border-[#485478] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 rounded-[2px] z-50 w-max max-w-[300px] text-[0.875rem] leading-[1.2] -top-2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none">
                          <span className="font-semibold mb-2 text-[1rem] leading-[1.2] break-all">
                            {span.name}
                          </span>
                          <div className="flex justify-between gap-4 text-[0.75rem] uppercase tracking-[0.08em] text-[#e6ebf8]">
                            <span>Duration:</span>
                            <span className="font-mono font-semibold text-white">
                              {duration}ms
                            </span>
                          </div>
                          {span.metadata?.tokens && (
                            <div className="flex justify-between gap-4 text-[0.75rem] uppercase tracking-[0.08em] text-[#e6ebf8] mt-1">
                              <span>Tokens:</span>
                              <span className="font-mono font-semibold text-white">
                                {span.metadata.tokens}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
