"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { TraceTable } from "@/components/analytics/TraceTable";
import { TraceAnalyticsCharts } from "@/components/analytics/TraceAnalyticsCharts";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import {
  getTraceDashboard,
  getTraces,
  syncTraces,
  DashboardMetrics,
  Trace,
  TracePaginatedResponse,
  AgentProfile,
} from "@/lib/api/traces";
import { AlertCircle, RefreshCw, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

/**
 * Agent Traces page
 *
 * SECURITY: All Lyzr API calls go through /api/* proxy routes.
 * The LYZR_API_KEY is NEVER present in this client component.
 */

export default function AgentTracePage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [agentId, setAgentId] = useState("");
  const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>([]);
  const agentProfilesRef = useRef<AgentProfile[]>([]);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [isTracesLoading, setIsTracesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load config and agent profiles on mount
  useEffect(() => {
    async function loadConfig() {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("lyzr_cache_"))
        .forEach((k) => localStorage.removeItem(k));

      try {
        const res = await fetch("/api/config");
        const cfg = await res.json();
        const profiles: AgentProfile[] = cfg.agentProfiles ?? [];
        agentProfilesRef.current = profiles;
        setAgentProfiles(profiles);
        const stored = localStorage.getItem("LYZR_AGENT_ID_TRACES");
        setAgentId(stored ?? "");
      } catch { /* proceed without profiles */ }
      setReady(true);
    }
    loadConfig();
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsMetricsLoading(true);
    setIsTracesLoading(true);
    setError(null);

    const profiles = agentProfilesRef.current;
    const showAll = !agentId && profiles.length > 1;

    const endOfDay = (d: string) => {
      const dt = new Date(d); dt.setUTCHours(23, 59, 59, 999); return dt.toISOString();
    };
    const baseFilters = {
      start_time: startDate ? new Date(startDate).toISOString() : undefined,
      end_time:   endDate   ? endOfDay(endDate)                  : undefined,
    };

    try {
      if (showAll && profiles.length > 0) {
        const [perAgent, perTraces] = await Promise.all([
          Promise.allSettled(profiles.map((p) => getTraceDashboard({ ...baseFilters, agent_id: p.agentId }))),
          Promise.allSettled(profiles.map((p) => getTraces({ ...baseFilters, agent_id: p.agentId }, 1, 50))),
        ]);

        const metricsList = perAgent
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<DashboardMetrics>).value);

        if (metricsList.length) {
          const total_traces = metricsList.reduce((s, m) => s + m.total_traces, 0);
          const total_tokens = metricsList.reduce((s, m) => s + m.total_tokens, 0);
          const avg_latency_ms = metricsList.reduce((s, m) => s + m.avg_latency_ms, 0) / metricsList.length;
          const success_rate = total_traces > 0
            ? metricsList.reduce((s, m) => s + m.success_rate * m.total_traces, 0) / total_traces
            : 100;
          setMetrics({
            total_traces, total_tokens, avg_latency_ms, success_rate,
            active_agents:  metricsList.length,
            daily_metrics:  metricsList.flatMap((m) => m.daily_metrics ?? []),
          });
        }

        const combined: Trace[] = perTraces
          .filter((r) => r.status === "fulfilled")
          .flatMap((r) => (r as PromiseFulfilledResult<TracePaginatedResponse>).value.data ?? []);
        combined.sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime());
        setTraces(combined.slice(0, 100));
      } else {
        const filters = { ...baseFilters, agent_id: agentId || undefined };
        const [metricsRes, tracesRes] = await Promise.all([
          getTraceDashboard(filters),
          getTraces(filters, 1, 100),
        ]);
        setMetrics(metricsRes);
        setTraces(tracesRes.data ?? []);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to fetch trace data.");
      setMetrics(null);
      setTraces([]);
    } finally {
      setIsMetricsLoading(false);
      setIsTracesLoading(false);
    }
  }, [startDate, endDate, agentId]);

  useEffect(() => { if (ready) loadDashboard(); }, [ready, loadDashboard]);
  useEffect(() => { localStorage.setItem("LYZR_AGENT_ID_TRACES", agentId); }, [agentId]);

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader size="medium" />
      </div>
    );
  }

  const showAll = !agentId && agentProfiles.length > 1;

  async function handleSync() {
    setIsSyncing(true);
    setIsTracesLoading(true);
    setError(null);
    const profiles = agentProfilesRef.current;
    const endOfDay = (d: string) => { const dt = new Date(d); dt.setUTCHours(23,59,59,999); return dt.toISOString(); };
    const baseFilters = {
      start_time: startDate ? new Date(startDate).toISOString() : undefined,
      end_time:   endDate   ? endOfDay(endDate)                  : undefined,
    };
    try {
      if (!agentId && profiles.length > 1) {
        const results = await Promise.allSettled(
          profiles.map((p) => syncTraces({ ...baseFilters, agent_id: p.agentId }, 1, 50))
        );
        const combined: Trace[] = results
          .filter((r) => r.status === "fulfilled")
          .flatMap((r) => (r as PromiseFulfilledResult<TracePaginatedResponse>).value.data ?? []);
        combined.sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime());
        setTraces(combined.slice(0, 100));
      } else {
        const res = await syncTraces({ ...baseFilters, agent_id: agentId || undefined }, 1, 100);
        setTraces(res.data ?? []);
      }
    } catch (err) {
      setError((err as Error).message || "Sync failed.");
    } finally {
      setIsSyncing(false);
      setIsTracesLoading(false);
    }
  }

  return (
    <div className="w-full h-full flex flex-col pt-6 pb-20 px-4 sm:px-8 gap-6 relative">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48] flex items-center gap-3">
            Agent Traces
            <span className="px-2 py-0.5 rounded-[4px] bg-white border border-[#14A687] text-[#14A687] text-[0.75rem] uppercase tracking-[0.08em] font-medium">
              Live
            </span>
          </h1>
          <p className="text-[0.875rem] leading-[1.2] font-normal text-[#485478] mt-1">
            Monitor and inspect execution paths across all agents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sync button — triggers POST /api/agent-traces (server-side Lyzr call) */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[2px] border border-[#e6ebf8] bg-white hover:bg-[#f0f1f7] transition-colors text-[#485478] text-[0.875rem] leading-[1.2] font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing…" : "Sync"}
          </button>

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
          />
        </div>
      </div>

      {/* Agent filter pills */}
      <div className="flex flex-wrap items-center gap-2 -mt-2">
        <button
          onClick={() => setAgentId("")}
          className={cn(
            "px-3 py-1 rounded-[2px] text-[0.75rem] font-medium border transition-all",
            showAll
              ? "bg-[#3c67ea] text-white border-[#3c67ea]"
              : "bg-white text-[#485478] border-[#e6ebf8] hover:text-[#242d48]"
          )}
        >
          All
        </button>
        {agentProfiles.map((p) => (
          <button
            key={p.agentId}
            onClick={() => setAgentId(p.agentId)}
            className={cn(
              "px-3 py-1 rounded-[2px] text-[0.75rem] font-medium border transition-all flex items-center gap-1.5",
              agentId === p.agentId
                ? "bg-[#3c67ea] text-white border-[#3c67ea]"
                : "bg-white text-[#485478] border-[#e6ebf8] hover:text-[#242d48]"
            )}
          >
            <Bot className="w-3 h-3" />
            {p.name}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error ? (
        <div className="bg-white border border-[#f2919d] text-[#db3743] p-4 rounded-[4px] flex items-start gap-4">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[1rem] leading-[1.2]">Connection Failed</h3>
            <p className="font-normal text-[0.875rem] leading-[1.2] mt-1">{error}</p>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] mt-2 opacity-80">
              Check that <code className="font-mono">LYZR_API_KEY</code> is set in <code className="font-mono">.env.local</code>.
            </p>
          </div>
        </div>
      ) : (
        <>
          <TraceAnalyticsCharts metrics={metrics} isLoading={isMetricsLoading} />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[1rem] leading-[1.2] font-semibold text-[#242d48]">Recent Executions</h2>
              <p className="text-[0.75rem] font-medium text-[#485478] uppercase tracking-[0.08em]">
                {traces?.length ?? 0} runs fetched
              </p>
            </div>
            <TraceTable traces={traces} isLoading={isTracesLoading} />
          </div>
        </>
      )}
    </div>
  );
}
