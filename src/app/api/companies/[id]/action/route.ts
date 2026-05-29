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
  const decision = body.decision as "accept" | "reject" | "complete";
  const by = (body.by as string | undefined)?.trim() || null;

  if (!actionId) return NextResponse.json({ error: "action_id is required" }, { status: 400 });
  if (decision !== "accept" && decision !== "reject" && decision !== "complete") {
    return NextResponse.json(
      { error: "decision must be 'accept', 'reject', or 'complete'" },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  if (!session.action_items) session.action_items = {};
  const statusByDecision = {
    accept: "accepted" as const,
    reject: "rejected" as const,
    complete: "completed" as const,
  };
  session.action_items[actionId] = {
    status: statusByDecision[decision],
    updated_at: nowIso,
    by,
  };
  session.updated_at = nowIso;
  const eventName =
    decision === "accept" ? "action_accepted" : decision === "reject" ? "action_rejected" : "action_completed";
  session.audit_log.push({ ts: nowIso, event: eventName, detail: actionId });

  await saveSession(session);
  return NextResponse.json({ session });
}
