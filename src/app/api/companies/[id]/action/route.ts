import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/rev-rec/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/action — accept or reject an anomaly action item.
// For the POC, "accept" simply records the decision (the task is treated as
// performed); a real integration would dispatch the email/calendar/etc. here.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const actionId = body.action_id as string;
  const decision = body.decision as "accept" | "reject";
  const by = (body.by as string | undefined)?.trim() || null;

  if (!actionId) return NextResponse.json({ error: "action_id is required" }, { status: 400 });
  if (decision !== "accept" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be 'accept' or 'reject'" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  if (!session.action_items) session.action_items = {};
  session.action_items[actionId] = {
    status: decision === "accept" ? "accepted" : "rejected",
    updated_at: nowIso,
    by,
  };
  session.updated_at = nowIso;
  session.audit_log.push({ ts: nowIso, event: `action_${decision}ed`, detail: actionId });

  await saveSession(session);
  return NextResponse.json({ session });
}
