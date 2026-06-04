import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, LYZR_API_BASE } from "@/lib/api/lyzr-server";

/**
 * GET /api/traces/dashboard
 * SERVER-SIDE PROXY — API key is added here, never sent to browser.
 * Forwards to: Lyzr GET /v3/traces/dashboard
 */
export async function GET(req: NextRequest) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "LYZR_API_KEY not configured in .env.local" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const target = new URL(`${LYZR_API_BASE}/v3/traces/dashboard`);

  const startTime = searchParams.get("start_time");
  const endTime   = searchParams.get("end_time");
  const agentId   = searchParams.get("agent_id");
  if (startTime) target.searchParams.set("start_time", startTime);
  if (endTime)   target.searchParams.set("end_time",   endTime);
  if (agentId)   target.searchParams.set("agent_id",   agentId);

  try {
    const res = await fetch(target.toString(), {
      headers: { "x-api-key": apiKey, accept: "application/json" },
    });
    if (!res.ok) {
      let detail = res.statusText;
      try { const b = await res.json(); detail = b.detail || b.message || b.error || detail; } catch {}
      return NextResponse.json({ error: detail }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
