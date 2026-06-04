import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, LYZR_API_BASE } from "@/lib/api/lyzr-server";
import { upsertTraces, queryTraces } from "@/lib/db/agent-traces";
import { Trace } from "@/lib/api/traces";

function toUtc(ts: string | null | undefined): string {
  if (!ts) return "";
  return ts.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(ts) ? ts : ts + "Z";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTrace(t: any): Trace {
  const durationMs =
    t.trace_duration != null
      ? Math.round(t.trace_duration * 1000)
      : (t.total_duration_ms ?? t.duration_ms ?? t.durationMs ?? 0);

  const hasError = t.has_error ?? t.hasError ?? t.error ?? false;
  const rawStatus = (t.status ?? t.state ?? "").toLowerCase();
  let status: Trace["status"] = "success";
  if (hasError || rawStatus === "error" || rawStatus === "failed" || rawStatus === "failure") {
    status = "error";
  } else if (rawStatus === "running" || rawStatus === "in_progress") {
    status = "running";
  }

  const rawCost = t.action_cost ?? t.total_cost ?? t.cost ?? null;
  const cost = rawCost != null ? Math.round(rawCost) / 100 : undefined;

  return {
    id:           t.trace_id   ?? t.id      ?? t._id   ?? "",
    agent_id:     t.name       ?? t.agent_id ?? t.agentId ?? "",
    session_id:   t.session_id ?? t.sessionId ?? "",
    status,
    start_time:   toUtc(t.trace_start_time ?? t.start_time ?? t.startTime ?? t.created_at),
    end_time:     toUtc(t.trace_end_time   ?? t.end_time   ?? t.endTime  ?? t.finished_at),
    duration_ms:  durationMs,
    total_tokens: ((t.llm_input_tokens ?? 0) + (t.llm_output_tokens ?? 0)) || (t.total_tokens ?? t.totalTokens ?? 0),
    cost,
    user_id:      t.user_id ?? t.userId,
  };
}

function parseParams(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return {
    startTime: searchParams.get("start_time") ?? undefined,
    endTime:   searchParams.get("end_time")   ?? undefined,
    agentId:   searchParams.get("agent_id")   ?? undefined,
    page:      Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1),
    size:      Math.min(200, Math.max(1, parseInt(searchParams.get("size") ?? "100") || 100)),
  };
}

async function syncFromLyzr(
  apiKey: string,
  agentId: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined
): Promise<number> {
  const lyzrUrl = new URL(`${LYZR_API_BASE}/v3/traces`);
  if (startTime) lyzrUrl.searchParams.append("start_time", startTime);
  if (endTime)   lyzrUrl.searchParams.append("end_time",   endTime);
  if (agentId)   lyzrUrl.searchParams.append("agent_id",   agentId);
  lyzrUrl.searchParams.append("page", "1");
  lyzrUrl.searchParams.append("size", "200");

  const lyzrRes = await fetch(lyzrUrl.toString(), {
    headers: { "x-api-key": apiKey, accept: "application/json" },
  });
  if (!lyzrRes.ok) return 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await lyzrRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawList: any[] =
    raw.data ?? raw.traces ?? raw.items ?? (Array.isArray(raw) ? raw : []);

  const normalized = rawList.map(normalizeTrace).filter((t) => t.id);
  // Stamp the query UUID so MongoDB can filter by the same value the client sends.
  if (agentId) {
    for (const t of normalized) t.agent_id = agentId;
  }
  if (normalized.length) await upsertTraces(normalized);
  return normalized.length;
}

// ── GET: read from MongoDB only — fast, no Lyzr call ────────────────────────
export async function GET(req: NextRequest) {
  const { startTime, endTime, agentId, page, size } = parseParams(req);

  try {
    const { data, total } = await queryTraces({
      agent_id:   agentId,
      start_time: startTime,
      end_time:   endTime,
      page,
      size,
    });
    return NextResponse.json({ data, total, page, size });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ── POST: sync from Lyzr → upsert MongoDB → return fresh data ───────────────
// Called only when the user clicks "Sync".
export async function POST(req: NextRequest) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "LYZR_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  const { startTime, endTime, agentId, page, size } = parseParams(req);

  try {
    await syncFromLyzr(apiKey, agentId, startTime, endTime);
  } catch {
    // Fall through — return whatever is in MongoDB even if Lyzr is unreachable
  }

  try {
    const { data, total } = await queryTraces({
      agent_id:   agentId,
      start_time: startTime,
      end_time:   endTime,
      page,
      size,
    });
    return NextResponse.json({ data, total, page, size });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
