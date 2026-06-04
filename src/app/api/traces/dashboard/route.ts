import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, LYZR_API_BASE } from "@/lib/api/lyzr-server";

export async function GET(req: NextRequest) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "LYZR_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = new URL(`${LYZR_API_BASE}/v3/traces/dashboard`);

  const startTime = searchParams.get("start_time");
  const endTime   = searchParams.get("end_time");
  const agentId   = searchParams.get("agent_id");

  if (startTime) targetUrl.searchParams.append("start_time", startTime);
  if (endTime)   targetUrl.searchParams.append("end_time",   endTime);
  if (agentId)   targetUrl.searchParams.append("agent_id",   agentId);

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: { "x-api-key": apiKey, accept: "application/json" },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = await response.json();
        detail = body.detail || body.message || body.error || detail;
      } catch {}
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
