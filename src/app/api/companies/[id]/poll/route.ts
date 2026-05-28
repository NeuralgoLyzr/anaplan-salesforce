import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/rev-rec/repo";
import { drive } from "@/lib/rev-rec/orchestrator";
import { withDriveLock } from "@/lib/rev-rec/drive-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/poll — advance the pipeline by polling the in-flight
// agent and submitting the next one if ready. The client calls this on an
// interval while the session is in a running state. Idempotent at gates.
// Guarded by withDriveLock so it can't race the background driver.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await withDriveLock(id, async () => {
      await drive(session);
      await saveSession(session);
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ session });
}
