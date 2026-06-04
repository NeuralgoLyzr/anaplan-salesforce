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
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trace Detail Page
 * SECURITY: Data fetched via /api/traces/* proxy routes — API key never in browser.
 */

function getModelLogo(modelName: string) {
  const n = modelName.toLowerCase();
  if (n.includes("gpt") || n.includes("openai"))   return "/logos/chatgpt-logo.jpg";
  if (n.includes("claude") || n.includes("anthropic")) return "/logos/anthropic.svg";
  if (n.includes("gemini") || n.includes("google")) return "/logos/gemini.svg";
  if (n.includes("grok")   || n.includes("xai"))   return "/logos/xai.svg";
  if (n.includes("llama")  || n.includes("meta"))  return "/logos/meta.svg";
  if (n.includes("mistral")|| n.includes("mixtral"))return "/logos/mistral.svg";
  return null;
}

export default function TraceDetailPage() {
  const params  = useParams();
  const traceId = params.traceId as string;
  const router  = useRouter();

  const [data, setData]       = useState<GanttChartData | null>(null);
  const [summary, setSummary] = useState<TraceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true); setError(null);
      if (typeof window !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("lyzr_cache_gantt") || k.startsWith("lyzr_cache_summary"))
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
      } finally { setIsLoading(false); }
    }
    load();
  }, [traceId]);

  if (isLoading) return (
    <div className="w-full h-full flex flex-col pt-6 pb-20 px-8 gap-6 max-w-7xl mx-auto">
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
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="w-[100px] h-[68px] rounded-[4px]" />)}
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

  if (error && !data && !summary) return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="bg-white text-[#db3743] p-6 rounded-[4px] border border-[#f2919d] shadow-[0_2px_4px_rgba(36,45,72,0.15)] text-center max-w-md">
        <h2 className="text-[1rem] leading-[1.2] font-semibold mb-2">Error Loading Trace</h2>
        <p className="text-[0.875rem] leading-[1.2] font-normal mb-6">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-[2px] text-[0.875rem] font-semibold text-[#3c67ea] shadow-[inset_0_0_0_1px_#3c67ea] hover:bg-[#f0f1f7] transition-colors"
        >Go Back</button>
      </div>
    </div>
  );

  const spans        = data?.spans ?? [];
  const hasSpans     = spans.length > 0;
  const resolvedId   = data?.trace_id ?? summary?.trace_id ?? traceId;
  const minTime      = hasSpans ? Math.min(...spans.map((s) => new Date(s.start_time).getTime())) : 0;
  const maxTime      = hasSpans ? Math.max(...spans.map((s) => new Date(s.end_time).getTime())) : 0;
  const totalDuration = maxTime - minTime;

  let llmTime = 0, toolTime = 0, agentTime = 0;
  const spanTokenData: { name: string; tokens: number }[] = [];
  spans.forEach((span) => {
    const dur = new Date(span.end_time).getTime() - new Date(span.start_time).getTime();
    if (span.type === "llm") llmTime += dur;
    else if (span.type === "tool") toolTime += dur;
    else agentTime += dur;
    if (span.metadata?.tokens) spanTokenData.push({ name: (span.name ?? "").slice(0, 15), tokens: span.metadata.tokens });
  });

  const tokenData = spanTokenData.length > 0 ? spanTokenData
    : [{ name: "Input", tokens: summary?.input_tokens ?? 0 }, { name: "Output", tokens: summary?.output_tokens ?? 0 }].filter((d) => d.tokens > 0);

  const pieData = [
    { name: "LLM Processing", value: llmTime },
    { name: "Tool Execution", value: toolTime },
    { name: "Agent Overhead", value: agentTime },
  ].filter((d) => d.value > 0);

  const PIE_COLORS = ["#7979d8","#3c67ea","#14a687","#ffbb16"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getIcon = (span: any) => {
    if (span.type === "llm") {
      const logo = getModelLogo(span.metadata?.model || summary?.model || "");
      if (logo) return <Image src={logo} alt="model" width={14} height={14} className="brightness-0 invert opacity-90" />;
      return <Cpu className="w-3.5 h-3.5" />;
    }
    if (span.type === "agent") return <Bot className="w-3.5 h-3.5" />;
    if (span.type === "tool")  return <Wrench className="w-3.5 h-3.5" />;
    if (span.type === "chain") return <LinkIcon className="w-3.5 h-3.5" />;
    return <Cpu className="w-3.5 h-3.5" />;
  };

  const barColor = (type: string, status: string) => {
    if (status === "error") return "bg-[#db3743] text-white";
    if (type === "llm")    return "bg-[#7979d8] text-white";
    if (type === "tool")   return "bg-[#3c67ea] text-white";
    if (type === "agent")  return "bg-[#3c67ea] text-white";
    return "bg-[#f0f1f7] text-[#242d48]";
  };

  return (
    <div className="w-full h-full flex flex-col pt-6 pb-20 px-8 gap-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#e6ebf8] pb-6">
        <Link href="/agent-trace"
          className="inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] hover:text-[#242d48] transition-colors bg-[#f0f1f7] px-3 py-1.5 rounded-[4px] border border-[#e6ebf8] w-fit">
          <ArrowLeft className="w-3 h-3" /> Back to Agent Traces
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {summary?.status && (
                <span className={cn("px-2.5 py-0.5 rounded-[2px] text-[0.75rem] font-medium uppercase tracking-[0.08em] border",
                  ["complete","success"].includes(summary.status.toLowerCase())
                    ? "bg-white text-[#14a687] border-[#14a687]"
                    : ["error","failed"].includes(summary.status.toLowerCase())
                    ? "bg-white text-[#db3743] border-[#db3743]"
                    : "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]"
                )}>{summary.status}</span>
              )}
              {summary?.agent_name && (
                <span className="text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#485478] bg-[#f0f1f7] px-2 py-0.5 rounded-[4px] border border-[#e6ebf8]">
                  {summary.agent_name}
                </span>
              )}
            </div>
            <h1 className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48]">Trace Analysis</h1>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] font-mono text-[#485478] bg-[#f0f1f7] px-2 py-1 rounded-[4px] border border-[#e6ebf8] w-fit">
              {resolvedId}
            </p>
          </div>

          {summary && (
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Duration", value: summary.duration_ms >= 1000 ? `${(summary.duration_ms/1000).toFixed(2)}s` : `${summary.duration_ms}ms` },
                { label: "Input Tokens",  value: summary.input_tokens.toLocaleString() },
                { label: "Output Tokens", value: summary.output_tokens.toLocaleString() },
                ...(summary.credits > 0 ? [{ label: "Credits", value: summary.credits.toFixed(4) }] : []),
                ...(summary.model ? [{ label: "Model", value: summary.model, isModel: true }] : []),
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center justify-center px-4 py-3 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex-1 min-w-[110px]">
                  <span className="text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] mb-1 text-center">{s.label}</span>
                  {s.isModel ? (
                    <div className="flex items-center gap-1.5">
                      {getModelLogo(s.value) && <Image src={getModelLogo(s.value)!} alt="model" width={14} height={14} />}
                      <span className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] break-all">{s.value}</span>
                    </div>
                  ) : (
                    <span className="text-[1rem] leading-[1.2] font-semibold text-[#242d48]">{s.value}</span>
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
              <p className="text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3c67ea]" /> Input — User Query
              </p>
              <div className="overflow-y-auto max-h-[300px]">
                <p className="text-[0.875rem] leading-[1.2] font-normal text-[#242d48] whitespace-pre-wrap">{data?.input ?? summary?.input}</p>
              </div>
            </div>
          )}
          {(data?.output || summary?.output) && (
            <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex flex-col gap-3">
              <p className="text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#14a687]" /> Output — Agent Response
              </p>
              <div className="overflow-y-auto max-h-[300px]">
                <p className="text-[0.875rem] leading-[1.2] font-normal text-[#242d48] whitespace-pre-wrap">{data?.output ?? summary?.output}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4">
          <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] mb-4">Time Allocation</h3>
          <div className="h-[250px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => [`${v}ms`, "Duration"]} contentStyle={{ borderRadius: 4, border: "1px solid #e6ebf8", fontSize: 13 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[0.875rem] font-medium text-[#485478]">No duration data</div>
            )}
          </div>
        </div>

        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4">
          <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] mb-4">Token Consumption</h3>
          <div className="h-[250px]">
            {tokenData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tokenData} layout="vertical" margin={{ right: 30, left: 20 }}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#485478" }} />
                  <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#485478" }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 4, border: "1px solid #e6ebf8", fontSize: 13 }} />
                  <Bar dataKey="tokens" fill="#3c67ea" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[0.875rem] font-medium text-[#485478]">No token data</div>
            )}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex-1">
        <h3 className="text-[1rem] leading-[1.2] font-semibold text-[#242d48] mb-6">Execution Critical Path (Gantt)</h3>

        {!hasSpans ? (
          <div className="flex items-center justify-center py-16 text-[0.875rem] font-medium text-[#485478]">No span data available.</div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="min-w-[700px]">
              <div className="flex border-b border-[#e6ebf8] pb-2 mb-4 relative h-6">
                <div className="absolute left-[240px] right-0 flex justify-between text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#485478]">
                  <span>0ms</span>
                  <span>{(totalDuration/2).toFixed(0)}ms</span>
                  <span>{totalDuration}ms</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 relative">
                <div className="absolute top-0 bottom-0 left-[240px] right-0 flex justify-between pointer-events-none">
                  {[0,1,2].map((i) => <div key={i} className="w-px h-full bg-[#e6ebf8]" />)}
                </div>

                {spans.map((span) => {
                  const startOffset = new Date(span.start_time).getTime() - minTime;
                  const duration    = new Date(span.end_time).getTime() - new Date(span.start_time).getTime();
                  const leftPct     = (startOffset / totalDuration) * 100;
                  const widthPct    = Math.max((duration / totalDuration) * 100, 0.5);
                  const depth       = span.parent_id ? 1 : 0;

                  return (
                    <div key={span.id} className="flex items-center group relative z-10">
                      <div className="w-[240px] flex-shrink-0 pr-4 flex items-center gap-3" style={{ paddingLeft: `${depth * 20}px` }}>
                        <div className={cn("p-2 rounded-[4px]", barColor(span.type, span.status))}>
                          {getIcon(span)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[0.875rem] leading-[1.2] font-semibold truncate text-[#242d48]">{span.name}</span>
                          <span className="text-[0.75rem] font-mono text-[#485478] uppercase">{span.type}</span>
                        </div>
                      </div>

                      <div className="flex-1 relative h-10 bg-[#f0f1f7] group-hover:bg-[#dfe2eb] transition-colors rounded-[2px] flex items-center">
                        <div
                          className={cn("absolute top-2 bottom-2 rounded-[2px] shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex items-center px-2 min-w-[6px]", barColor(span.type, span.status))}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        >
                          {widthPct > 10 && (
                            <span className="text-[0.75rem] font-medium opacity-90 truncate mx-auto">{duration}ms</span>
                          )}
                        </div>

                        {/* Tooltip */}
                        <div className="absolute hidden group-hover:flex flex-col bg-[#485478] text-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-3 rounded-[2px] z-50 w-max max-w-[260px] text-[0.8125rem] -top-2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none gap-1">
                          <span className="font-semibold break-all">{span.name}</span>
                          <span className="text-[#dfe2eb]">Duration: <span className="font-mono text-white">{duration}ms</span></span>
                          {span.metadata?.tokens && (
                            <span className="text-[#dfe2eb]">Tokens: <span className="font-mono text-white">{span.metadata.tokens}</span></span>
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
