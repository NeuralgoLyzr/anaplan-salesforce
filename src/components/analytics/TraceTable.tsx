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

// ── Model resolution — maps model name → logo path + display name ─────────
interface ModelMeta {
  logo: string;
  name: string;
  color: string;
}

function resolveModel(model: string): ModelMeta | null {
  const n = (model ?? "").toLowerCase();
  if (n.includes("gpt-4o"))
    return { logo: "/logos/chatgpt-logo.jpg", name: "GPT-4o",    color: "#10a37f" };
  if (n.includes("gpt") || n.includes("openai") || n.includes("o1") || n.includes("o3") || n.includes("o4"))
    return { logo: "/logos/chatgpt-logo.jpg", name: "OpenAI",    color: "#10a37f" };
  if (n.includes("claude"))
    return { logo: "/logos/anthropic.svg",   name: "Claude",     color: "#d97706" };
  if (n.includes("anthropic"))
    return { logo: "/logos/anthropic.svg",   name: "Anthropic",  color: "#d97706" };
  if (n.includes("gemini"))
    return { logo: "/logos/gemini.svg",      name: "Gemini",     color: "#8e75b2" };
  if (n.includes("google"))
    return { logo: "/logos/gemini.svg",      name: "Google",     color: "#8e75b2" };
  if (n.includes("grok") || n.includes("xai"))
    return { logo: "/logos/xai.svg",         name: "Grok",       color: "#000000" };
  if (n.includes("llama") || n.includes("meta"))
    return { logo: "/logos/meta.svg",        name: "Llama",      color: "#0082fb" };
  if (n.includes("mistral") || n.includes("mixtral"))
    return { logo: "/logos/mistral.svg",     name: "Mistral",    color: "#f54e42" };
  if (n.includes("ollama"))
    return { logo: "/logos/ollama.svg",      name: "Ollama",     color: "#333333" };
  return null;
}

// ── Async model logo — fetches summary per trace to get model name ─────────
// Shows in the AGENT (first) column alongside the agent ID.
function AgentWithModel({ traceId, agentId, sessionId }: {
  traceId: string;
  agentId: string;
  sessionId: string;
}) {
  const [model, setModel] = React.useState<ModelMeta | null | "loading" | "failed">("loading");

  React.useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => { if (!cancelled) setModel("failed"); }, 8000);
    getTraceSummary(traceId)
      .then((res) => {
        clearTimeout(timeout);
        if (!cancelled) setModel(res.model ? resolveModel(res.model) : null);
      })
      .catch(() => { clearTimeout(timeout); if (!cancelled) setModel("failed"); });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [traceId]);

  const logoSize = 20; // px — shown prominently in first column

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Model logo badge */}
      <div className="flex-shrink-0 w-8 h-8 rounded-[4px] border border-[#e6ebf8] bg-white flex items-center justify-center overflow-hidden">
        {model === "loading" ? (
          <Skeleton className="w-5 h-5 rounded-[2px]" />
        ) : model && model !== "failed" ? (
          <Image
            src={(model as ModelMeta).logo}
            alt={(model as ModelMeta).name}
            width={logoSize}
            height={logoSize}
            className="object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Cpu className="w-4 h-4 text-[#909cc0]" />
        )}
      </div>

      {/* Agent ID + session */}
      <div className="flex flex-col min-w-0">
        <span className="text-[0.8125rem] font-semibold text-[#242d48] leading-[1.2] truncate max-w-[180px]">
          {agentId || "—"}
        </span>
        {model && model !== "loading" && model !== "failed" && (
          <span className="text-[0.75rem] font-medium text-[#909cc0] leading-[1.2]">
            {(model as ModelMeta).name}
          </span>
        )}
        {sessionId && !(model && model !== "loading" && model !== "failed") && (
          <span className="text-[0.75rem] font-medium text-[#909cc0] font-mono leading-[1.2]">
            {sessionId.slice(0, 12)}…
          </span>
        )}
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS_STYLE = {
  success: "bg-white text-[#14a687] border-[#14a687]",
  error:   "bg-white text-[#db3743] border-[#db3743]",
  running: "bg-white text-[#3c67ea] border-[#e6ebf8]",
} as const;

// ── Table ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

interface Props {
  traces: Trace[];
  isLoading: boolean;
  onRefreshAll?: () => void;
}

export function TraceTable({ traces, isLoading }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(traces.length / PAGE_SIZE));
  const paged = traces.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function fmt(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  function dur(ms: number) {
    if (!ms) return "—";
    return ms >= 60000 ? `${(ms / 60000).toFixed(1)}m`
         : ms >= 1000  ? `${(ms / 1000).toFixed(1)}s`
         : `${ms}ms`;
  }
  function tkns(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full bg-white border border-[#e6ebf8] rounded-[4px] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e6ebf8] bg-white">
              {["Agent","Status","Started","Duration","Tokens","Cost",""].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#e6ebf8] last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-[4px] flex-shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-32 rounded-[4px]" />
                      <Skeleton className="h-2.5 w-16 rounded-[4px]" />
                    </div>
                  </div>
                </td>
                {Array.from({ length: 5 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-3 rounded-[4px]" style={{ width: j === 0 ? 64 : 72 }} />
                  </td>
                ))}
                <td className="px-3 py-3"><Skeleton className="w-4 h-4 rounded-[4px]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (!traces.length) {
    return (
      <div className="w-full bg-white border border-[#e6ebf8] rounded-[4px] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-8 flex flex-col items-center justify-center min-h-[200px] gap-3">
        <Cpu className="w-8 h-8 text-[#909cc0]" />
        <p className="text-[0.875rem] font-semibold text-[#485478]">No traces found</p>
        <p className="text-[0.75rem] font-medium text-[#909cc0] text-center max-w-xs">
          Click <span className="font-semibold text-[#3c67ea]">Sync</span> to pull the latest execution data from Lyzr.
        </p>
      </div>
    );
  }

  // ── Data table ─────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-white border border-[#e6ebf8] rounded-[4px] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e6ebf8] bg-white">
              {/* First column = Agent + Model logo */}
              <th className="px-4 py-2.5 text-left text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] whitespace-nowrap">
                Agent
              </th>
              {["Status","Started","Duration","Tokens","Cost",""].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((t) => (
              <tr
                key={t.id}
                onClick={() => router.push(`/agent-trace/traces/${t.id}`)}
                className="border-b border-[#e6ebf8] last:border-0 hover:bg-[#f8f8fa] cursor-pointer transition-colors group"
              >
                {/* AGENT column — model logo + agent ID + model name */}
                <td className="px-4 py-3">
                  <AgentWithModel
                    traceId={t.id}
                    agentId={t.agent_id}
                    sessionId={t.session_id}
                  />
                </td>

                {/* STATUS */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[0.75rem] font-medium px-1 py-0 rounded-[2px] border uppercase ${STATUS_STYLE[t.status]}`}>
                    {t.status}
                  </span>
                </td>

                {/* STARTED */}
                <td className="px-4 py-3 text-[0.8125rem] font-normal text-[#485478] leading-[1.2] whitespace-nowrap">
                  {fmt(t.start_time)}
                </td>

                {/* DURATION */}
                <td className="px-4 py-3 text-[0.8125rem] font-normal text-[#485478] leading-[1.2] tabular-nums whitespace-nowrap">
                  {dur(t.duration_ms)}
                </td>

                {/* TOKENS */}
                <td className="px-4 py-3 text-[0.8125rem] font-normal text-[#485478] leading-[1.2] tabular-nums">
                  {tkns(t.total_tokens)}
                </td>

                {/* COST */}
                <td className="px-4 py-3 text-[0.8125rem] font-normal text-[#485478] leading-[1.2] tabular-nums">
                  {t.cost != null ? `$${t.cost.toFixed(4)}` : "—"}
                </td>

                {/* Arrow */}
                <td className="px-3 py-3">
                  <ArrowRight className="w-4 h-4 text-[#909cc0] opacity-0 group-hover:opacity-100 transition-opacity" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-[#e6ebf8] flex items-center justify-between">
          <span className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2] whitespace-nowrap">
            {traces.length} total · page {page} of {totalPages}
          </span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
