import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/rev-rec/repo";
import { maybeComplete } from "@/lib/rev-rec/gates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/gate4 — post the journal entry batch (all at once).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const approverName = (body.approver_name as string | undefined)?.trim() || "Approver";
  const nowIso = new Date().toISOString();

  session.gates.g4_je_post = {
    status: "approved",
    approver_name: approverName,
    approved_at: nowIso,
    notes: null,
  };
  session.updated_at = nowIso;
  session.audit_log.push({ ts: nowIso, event: "gate4_posted", detail: approverName });

  maybeComplete(session);
  await saveSession(session);
  return NextResponse.json({ session });
}
