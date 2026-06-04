/**
 * Trace API — CLIENT-SIDE fetch functions.
 *
 * SECURITY: Every function calls a Next.js API route (/api/traces/* or
 * /api/agent-traces). The Lyzr API key is NEVER present in this file.
 * It lives server-side in lyzr-server.ts and is only used in route handlers.
 */

export interface DailyMetric {
  date: string;
  total_traces: number;
  success_count: number;
  error_count: number;
  total_tokens: number;
  input_tokens?: number;
  output_tokens?: number;
  avg_latency_ms: number;
  p95_latency_ms?: number;
  credits_consumed: number;
}

export interface DashboardMetrics {
  total_traces: number;
  success_rate: number;
  avg_latency_ms: number;
  total_tokens: number;
  active_agents: number;
  daily_metrics: DailyMetric[];
}

export interface Trace {
  id: string;
  agent_id: string;
  session_id: string;
  status: "success" | "error" | "running";
  start_time: string;
  end_time: string;
  duration_ms: number;
  total_tokens: number;
  cost?: number;
  user_id?: string;
}

export interface TracePaginatedResponse {
  data: Trace[];
  total: number;
  page: number;
  size: number;
}

export interface GanttSpan {
  id: string;
  name: string;
  type: "llm" | "tool" | "chain" | "agent";
  start_time: string;
  end_time: string;
  parent_id: string | null;
  status: "success" | "error";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface GanttChartData {
  trace_id: string;
  spans: GanttSpan[];
  input?: string;
  output?: string;
}

export interface TraceSummary {
  trace_id: string;
  status: string;
  agent_name: string;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  credits: number;
  model: string;
  input?: string;
  output?: string;
}

export interface TraceFilters {
  start_time?: string;
  end_time?: string;
  agent_id?: string;
  session_id?: string;
}

export interface AgentProfile {
  name: string;
  agentId: string;
}

// ── Cache helpers (localStorage, 5-min TTL) ────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cacheKey(tag: string, params: Record<string, any>) {
  return `lyzr_cache_${tag}_${JSON.stringify(params)}`;
}

function cacheGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return parsed.data as T;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cacheSet(key: string, data: any) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

async function throwOnError(res: Response): Promise<never> {
  let msg = `${res.status} ${res.statusText}`;
  try { const b = await res.json(); msg = b.error || b.detail || b.message || msg; } catch {}
  throw new Error(msg);
}

function toUtc(ts: string | null | undefined): string {
  if (!ts) return "";
  return ts.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(ts) ? ts : ts + "Z";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTrace(t: any): Trace {
  const durationMs = t.trace_duration != null
    ? Math.round(t.trace_duration * 1000)
    : (t.total_duration_ms ?? t.duration_ms ?? t.durationMs ?? 0);
  const hasError = t.has_error ?? t.hasError ?? t.error ?? false;
  const rawStatus = (t.status ?? t.state ?? "").toLowerCase();
  let status: Trace["status"] = "success";
  if (hasError || ["error","failed","failure"].includes(rawStatus)) status = "error";
  else if (["running","in_progress"].includes(rawStatus)) status = "running";
  const rawCost = t.action_cost ?? t.total_cost ?? t.cost ?? null;
  return {
    id:           t.trace_id ?? t.id ?? t._id ?? "",
    agent_id:     t.name ?? t.agent_id ?? t.agentId ?? "",
    session_id:   t.session_id ?? t.sessionId ?? "",
    status,
    start_time:   toUtc(t.trace_start_time ?? t.start_time ?? t.startTime ?? t.created_at),
    end_time:     toUtc(t.trace_end_time ?? t.end_time ?? t.endTime ?? t.finished_at),
    duration_ms:  durationMs,
    total_tokens: ((t.llm_input_tokens ?? 0) + (t.llm_output_tokens ?? 0)) || (t.total_tokens ?? t.totalTokens ?? 0),
    cost:         rawCost != null ? Math.round(rawCost) / 100 : undefined,
    user_id:      t.user_id ?? t.userId,
  };
}

// ── Public API (all calls go through /api/* proxy routes) ─────────────────

/** Dashboard KPI metrics — proxied server-side, API key never in browser. */
export async function getTraceDashboard(filters?: TraceFilters): Promise<DashboardMetrics> {
  const key = cacheKey("dashboard", { ...filters });
  const hit = cacheGet<DashboardMetrics>(key);
  if (hit) return hit;

  const url = new URL("/api/traces/dashboard", window.location.origin);
  if (filters?.start_time) url.searchParams.set("start_time", filters.start_time);
  if (filters?.end_time)   url.searchParams.set("end_time",   filters.end_time);
  if (filters?.agent_id)   url.searchParams.set("agent_id",   filters.agent_id);

  const res = await fetch(url.toString());
  if (!res.ok) await throwOnError(res);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json();
  const errorRate = raw.avg_error_rate ?? raw.error_rate ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daily: DailyMetric[] = (raw.daily_metrics ?? []).map((d: any) => ({
    date:            d.date ?? "",
    total_traces:    d.total_traces ?? 0,
    success_count:   d.success_count ?? 0,
    error_count:     d.error_count ?? 0,
    total_tokens:    d.total_tokens ?? (d.total_input_tokens ?? 0) + (d.total_output_tokens ?? 0),
    input_tokens:    d.total_input_tokens ?? d.input_tokens,
    output_tokens:   d.total_output_tokens ?? d.output_tokens,
    avg_latency_ms:  d.avg_latency_ms ?? 0,
    p95_latency_ms:  d.p95_latency_ms ?? d.p95_latency,
    credits_consumed: (d.credits_consumed ?? 0) / 100,
  }));

  const result: DashboardMetrics = {
    total_traces:   raw.total_traces ?? 0,
    success_rate:   (1 - errorRate) * 100,
    avg_latency_ms: raw.avg_latency_ms ?? 0,
    total_tokens:   raw.total_tokens ?? (raw.total_input_tokens ?? 0) + (raw.total_output_tokens ?? 0),
    active_agents:  raw.active_agents ?? raw.activeAgents ?? 0,
    daily_metrics:  daily,
  };

  cacheSet(key, result);
  return result;
}

/** Read traces from MongoDB cache — fast, no Lyzr call. */
export async function getTraces(
  filters?: TraceFilters, page = 1, size = 10
): Promise<TracePaginatedResponse> {
  const url = new URL("/api/agent-traces", window.location.origin);
  if (filters?.start_time) url.searchParams.set("start_time", filters.start_time);
  if (filters?.end_time)   url.searchParams.set("end_time",   filters.end_time);
  if (filters?.agent_id)   url.searchParams.set("agent_id",   filters.agent_id);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const res = await fetch(url.toString());
  if (!res.ok) await throwOnError(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json();
  return { data: raw.data ?? [], total: raw.total ?? 0, page: raw.page ?? page, size: raw.size ?? size };
}

/** Sync from Lyzr → upsert MongoDB → return fresh data (Sync button). */
export async function syncTraces(
  filters?: TraceFilters, page = 1, size = 10
): Promise<TracePaginatedResponse> {
  const url = new URL("/api/agent-traces", window.location.origin);
  if (filters?.start_time) url.searchParams.set("start_time", filters.start_time);
  if (filters?.end_time)   url.searchParams.set("end_time",   filters.end_time);
  if (filters?.agent_id)   url.searchParams.set("agent_id",   filters.agent_id);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) await throwOnError(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json();
  return { data: raw.data ?? [], total: raw.total ?? 0, page: raw.page ?? page, size: raw.size ?? size };
}

/** Gantt span data for a single trace — proxied, API key server-side only. */
export async function getTraceGantt(traceId: string): Promise<GanttChartData> {
  const key = cacheKey(`gantt_${traceId}`, {});
  const hit = cacheGet<GanttChartData>(key);
  if (hit) return hit;

  const res = await fetch(`/api/traces/${traceId}/gantt`);
  if (!res.ok) await throwOnError(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractText(v: any): string | undefined {
    if (!v) return undefined;
    if (typeof v === "string") return v;
    return v.content ?? v.text ?? v.message ?? JSON.stringify(v);
  }

  function spanType(name: string): GanttSpan["type"] {
    const n = (name ?? "").toLowerCase();
    if (n.includes("llm") || n === "generation" || n === "inference") return "llm";
    if (n.includes("tool") || n === "memory") return "tool";
    if (n === "chain" || n.includes("pipeline")) return "chain";
    return "agent";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function flattenTree(node: any, parentId: string | null = null): any[] {
    const flat = [{ ...node, _parentId: parentId }];
    for (const child of node.children ?? []) flat.push(...flattenTree(child, node.span_id ?? node.id ?? ""));
    return flat;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildSpan(s: any): GanttSpan {
    const startMs = s.startTime ?? s.start_time_ms ?? 0;
    const durMs   = s.duration ?? s.duration_ms ?? 0;
    const startISO = startMs ? new Date(startMs).toISOString() : (s.start_time ?? new Date().toISOString());
    const endISO   = startMs ? new Date(startMs + durMs).toISOString() : (s.end_time ?? startISO);
    const name = s.span_name ?? s.name ?? s.operation ?? "Span";
    const hasErr = s.hasError ?? s.has_error ?? false;
    const inTok  = s.tags?.llm_input_tokens ?? s.tags?.input_tokens ?? 0;
    const outTok = s.tags?.llm_output_tokens ?? s.tags?.output_tokens ?? 0;
    const tokens = (inTok + outTok) || s.tags?.tokens || 0;
    return {
      id: s.span_id ?? s.id ?? "",
      name,
      type: spanType(name),
      start_time: startISO,
      end_time:   endISO,
      parent_id:  s._parentId ?? s.parent_id ?? null,
      status:     hasErr || (s.tags?.status ?? s.status ?? "") === "error" ? "error" : "success",
      metadata:   { ...s.tags, duration_ms: durMs, ...(tokens > 0 ? { tokens } : {}) },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawSpans: any[];
  if (raw.span_tree && typeof raw.span_tree === "object") {
    rawSpans = flattenTree(raw.span_tree);
  } else if (Array.isArray(raw)) {
    rawSpans = raw;
  } else {
    rawSpans = [];
    for (const k of ["spans","steps","events","trace_spans","nodes","children","activities"]) {
      if (Array.isArray(raw[k]) && raw[k].length > 0) { rawSpans = raw[k]; break; }
    }
    if (!rawSpans.length) for (const v of Object.values(raw)) {
      if (Array.isArray(v) && (v as unknown[]).length > 0) { rawSpans = v as typeof rawSpans; break; }
    }
  }

  const rootTags = raw.span_tree?.tags ?? {};
  const result: GanttChartData = {
    trace_id: raw.trace_id ?? raw.id ?? traceId,
    spans:    rawSpans.map(buildSpan),
    input:    extractText(rootTags.input ?? raw.input ?? raw.user_input),
    output:   extractText(rootTags.output ?? raw.output ?? raw.agent_output),
  };
  cacheSet(key, result);
  return result;
}

/** Summary KPIs for a single trace — proxied, API key server-side only. */
export async function getTraceSummary(traceId: string): Promise<TraceSummary> {
  const key = cacheKey(`summary_${traceId}`, {});
  const hit = cacheGet<TraceSummary>(key);
  if (hit) return hit;

  const res = await fetch(`/api/traces/${traceId}/summary`);
  if (!res.ok) await throwOnError(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function toText(v: any): string | undefined {
    if (!v) return undefined;
    if (typeof v === "string") return v;
    return v.content ?? v.text ?? v.message ?? JSON.stringify(v);
  }

  const inTok  = raw.total_input_tokens  ?? raw.input_tokens  ?? raw.prompt_tokens     ?? 0;
  const outTok = raw.total_output_tokens ?? raw.output_tokens ?? raw.completion_tokens  ?? 0;

  const result: TraceSummary = {
    trace_id:     raw.trace_id ?? raw.id ?? traceId,
    status:       raw.status ?? raw.state ?? "complete",
    agent_name:   raw.agent_name ?? raw.agentName ?? raw.name ?? "",
    duration_ms:  raw.total_duration_ms ?? raw.duration_ms ?? (raw.duration_seconds ? raw.duration_seconds * 1000 : 0),
    input_tokens:  inTok,
    output_tokens: outTok,
    total_tokens:  raw.total_tokens ?? raw.totalTokens ?? inTok + outTok,
    credits:      (raw.total_cost ?? raw.credits ?? raw.cost ?? 0) / 100,
    model:        raw.llm_model ?? raw.model ?? raw.model_name ?? "",
    input:        toText(raw.input ?? raw.user_input ?? raw.query),
    output:       toText(raw.output ?? raw.agent_output ?? raw.response),
  };
  cacheSet(key, result);
  return result;
}
