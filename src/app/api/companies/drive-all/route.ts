import { NextResponse } from "next/server";
import { salesforceConfig } from "@/lib/config";
import { listBusySessions, saveSession } from "@/lib/rev-rec/repo";
import { drive } from "@/lib/rev-rec/orchestrator";
import { withDriveLock } from "@/lib/rev-rec/drive-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/companies/drive-all — advance every in-flight Session by one drive()
// loop. Hit on a 5s tick by the background worker so the pipeline progresses
// even when no one has the customer page open. Uses the same bearer secret as
// /api/salesforce/sync (one secret, one worker).
export async function POST(req: Request) {
  const secret = salesforceConfig.syncSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "SALESFORCE_SYNC_SECRET is not configured on the server" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const presented = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (presented !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let sessions;
  try {
    sessions = await listBusySessions();
  } catch (e) {
    return NextResponse.json(
      { error: `failed to list busy sessions: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  // Drive sessions in parallel — they're independent of each other and the
  // bottleneck is waiting on Lyzr task API responses. Per-session safety is
  // handled by withDriveLock; nothing here calls Mongo with stale state.
  const results = await Promise.all(
    sessions.map(async (s) => {
      const beforeStatus = s.status;
      try {
        await withDriveLock(s.session_id, async () => {
          await drive(s);
          await saveSession(s);
        });
        return {
          session_id: s.session_id,
          company_name: s.company_name,
          before: beforeStatus,
          after: s.status,
          ok: true as const,
        };
      } catch (e) {
        return {
          session_id: s.session_id,
          company_name: s.company_name,
          before: beforeStatus,
          after: s.status,
          ok: false as const,
          error: (e as Error).message,
        };
      }
    }),
  );

  const advanced = results.filter((r) => r.ok && r.before !== r.after).length;
  const errors = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    busy: sessions.length,
    advanced,
    errors,
    results,
  });
}
