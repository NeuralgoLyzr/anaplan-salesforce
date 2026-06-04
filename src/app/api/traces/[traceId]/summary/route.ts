import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, LYZR_API_BASE } from "@/lib/api/lyzr-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "LYZR_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  const { traceId } = await params;

  try {
    const response = await fetch(
      `${LYZR_API_BASE}/v3/traces/${traceId}/summary`,
      { headers: { "x-api-key": apiKey, accept: "application/json" } }
    );

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
