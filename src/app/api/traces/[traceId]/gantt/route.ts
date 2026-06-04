import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, LYZR_API_BASE } from "@/lib/api/lyzr-server";

/**
 * GET /api/traces/[traceId]/gantt
 * SERVER-SIDE PROXY — API key is added here, never sent to browser.
 * Forwards to: Lyzr GET /v3/traces/{traceId}/gantt
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "LYZR_API_KEY not configured in .env.local" }, { status: 500 });
  }

  const { traceId } = await params;
  try {
    const res = await fetch(`${LYZR_API_BASE}/v3/traces/${traceId}/gantt`, {
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
