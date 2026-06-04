"use client";

import React, { useState } from "react";
import { Trace, getTraceSummary } from "@/lib/api/traces";
import { useRouter } from "next/navigation";
import { ArrowRight, Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ModelMeta {
  logo: string;
  color: string;
}

function resolveModel(modelName: string): ModelMeta | null {
  const n = modelName.toLowerCase();
  if (n.includes("gpt") || n.includes("openai") || n.includes("o1") || n.includes("o3") || n.includes("o4"))
    return { logo: "/logos/chatgpt-logo.jpg", color: "#10a37f" };
  if (n.includes("claude") || n.includes("anthropic"))
    return { logo: "/logos/anthropic.svg", color: "#d97706" };
  if (n.includes("gemini") || n.includes("google") || n.includes("bard"))
    return { logo: "/logos/gemini.svg", color: "#8e75b2" };
  if (n.includes("grok") || n.includes("xai") || n.includes("x.ai"))
    return { logo: "/logos/xai.svg", color: "#000000" };
  if (n.includes("llama") || n.includes("meta"))
    return { logo: "/logos/meta.svg", color: "#0082fb" };
  if (n.includes("mistral") || n.includes("mixtral"))
    return { logo: "/logos/mistral.svg", color: "#f54e42" };
  return null;
}

function AsyncModelLogo({ traceId }: { traceId: string }) {
  const [meta, setMeta] = React.useState<ModelMeta | null | "loading" | "failed">("loading");

  React.useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setMeta("failed");
    }, 6000);

    getTraceSummary(traceId)
      .then((res) => {
        clearTimeout(timeout);
        if (!cancelled) {
          const resolved = res.model ? resolveModel(res.model) : null;
          setMeta(resolved ?? "failed");
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!cancelled) setMeta("failed");
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [traceId]);

  if (meta === "loading") {
    return <div className="w-5 h-5 rounded-[4px] bg-[#f0f1f7] " />;
  }
  if (meta === "failed" || !meta) {
    return <Cpu className="w-4 h-4 text-[#485478]" />;
  }

  const isRaster = meta.logo.endsWith(".jpg") || meta.logo.endsWith(".png");
  return (
    <Image
      src={meta.logo}
      alt="model"
      width={18}
      height={18}
      className={isRaster ? "rounded-[2px] object-contain" : "opacity-75 dark:invert"}
    />
  );
}

function fmtTimestamp(ts: string): string {
  if (!ts) return "—";
  const utc = ts.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(ts) ? ts : ts + "Z";
  const d = new Date(utc);
  if (isNaN(d.getTime())) return ts;
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  return `${day} ${month} ${year}, ${time}`;
}

interface TraceTableProps {
  traces: Trace[];
  isLoading: boolean;
  onRefreshAll?: () => void;
}

export function TraceTable({ traces, isLoading }: TraceTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(traces.length / pageSize));

  React.useEffect(() => {
    setCurrentPage(1);
  }, [traces.length]);

  const paginatedTraces = traces.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (isLoading) {
    return (
      <div className="w-full bg-white border border-[#e6ebf8] rounded-[4px] overflow-hidden shadow-[0_2px_4px_rgba(36,45,72,0.15)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e6ebf8] bg-[#f0f1f7]">
                {["Model", "Trace ID", "Agent", "Start Time", "Duration", "Cost", "Tokens", ""].map((h, i) => (
                  <th key={i} className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td className="py-3 px-5"><Skeleton className="w-7 h-7 rounded-[4px]" /></td>
                  <td className="py-3 px-5"><Skeleton className="h-4 w-28 rounded" /></td>
                  <td className="py-3 px-5"><Skeleton className="h-5 w-24 rounded-[4px]" /></td>
                  <td className="py-3 px-5"><Skeleton className="h-4 w-36 rounded" /></td>
                  <td className="py-3 px-5 text-right"><Skeleton className="h-4 w-10 rounded ml-auto" /></td>
                  <td className="py-3 px-5 text-right"><Skeleton className="h-4 w-12 rounded ml-auto" /></td>
                  <td className="py-3 px-5 text-right"><Skeleton className="h-4 w-14 rounded ml-auto" /></td>
                  <td className="py-3 px-5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!traces || traces.length === 0) {
    return (
      <div className="w-full bg-white border border-[#e6ebf8] rounded-[4px] p-8 flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#485478]">
          No traces found for this period.
        </p>

      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-[#e6ebf8] rounded-[4px] overflow-hidden shadow-[0_2px_4px_rgba(36,45,72,0.15)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e6ebf8] bg-[#f0f1f7]">
              <th className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478] w-14">
                Model
              </th>
              <th className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478]">
                Trace ID
              </th>
              <th className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478]">
                Agent
              </th>
              <th className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478]">
                Start Time
              </th>
              <th className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478] text-right">
                Duration
              </th>
              <th className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478] text-right">
                Cost
              </th>
              <th className="py-4 px-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478] text-right">
                Tokens
              </th>
              <th className="py-4 px-5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTraces.map((trace) => (
              <tr
                key={trace.id}
                onClick={() =>
                  trace.id && router.push(`/agent-trace/traces/${trace.id}`)
                }
                className="group hover:bg-[#f0f1f7] cursor-pointer transition-colors"
              >
                <td className="py-3 px-5">
                  <div className="flex items-center justify-center w-7 h-7">
                    <AsyncModelLogo traceId={trace.id ?? ""} />
                  </div>
                </td>
                <td className="py-3 px-5">
                  <span className="text-[0.875rem] leading-[1.2] font-semibold font-mono group-hover:text-[#3c67ea] transition-colors">
                    {(trace.id ?? "").substring(0, 12)}…
                  </span>
                </td>
                <td className="py-3 px-5">
                  <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold px-2 py-1 bg-[#f0f1f7] dark:bg-[#f0f1f7] rounded-[4px]">
                    {trace.agent_id ?? "—"}
                  </span>
                </td>
                <td className="py-3 px-5">
                  <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] font-semibold">
                    {fmtTimestamp(trace.start_time)}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className="text-[0.875rem] leading-[1.2] font-semibold">
                    {((trace.duration_ms ?? 0) / 1000).toFixed(2)}s
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className="text-[0.875rem] leading-[1.2] font-semibold">
                    {trace.cost != null ? trace.cost.toFixed(4) : "—"}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className="text-[0.875rem] leading-[1.2] font-semibold">
                    {(trace.total_tokens ?? 0).toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <ArrowRight className="w-4 h-4 text-[#485478] opacity-0 group-hover:opacity-100 transition-opacity" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-[#e6ebf8] bg-[#f0f1f7]  flex items-center justify-between gap-4">
        <div />

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] px-4">
                  Page {currentPage} of {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
