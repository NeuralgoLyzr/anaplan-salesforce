import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/rev-rec/repo";
import { reconciliationOk } from "@/lib/rev-rec/orchestrator";
import type { GateDecision } from "@/lib/rev-rec/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/gate1 — approve or reject one section of the revenue
// plan (Allocation or Monthly projection). Billing (Agent 4) only runs once
// BOTH sections are approved.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.status !== "gate1") {
    return NextResponse.json({ error: `Gate 1 not available in status "${session.status}"` }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const section = body.section as "allocation" | "monthly";
  const decision = body.decision as "approve" | "reject";
  const approverName = (body.approver_name as string | undefined)?.trim() || "Approver";
  const notes = (body.notes as string | undefined) ?? null;
  const nowIso = new Date().toISOString();

  if (section !== "allocation" && section !== "monthly") {
    return NextResponse.json({ error: "section must be 'allocation' or 'monthly'" }, { status: 400 });
  }
  const gateKey = section === "allocation" ? "g1_allocation" : "g1_monthly";

  // Reject either section → the whole revenue plan is rejected.
  if (decision === "reject") {
    const rejected: GateDecision = { status: "rejected", approver_name: approverName, approved_at: nowIso, notes };
    session.gates[gateKey] = rejected;
    session.gates.g1_revenue_plan = rejected;
    session.status = "rejected";
    session.updated_at = nowIso;
    session.audit_log.push({ ts: nowIso, event: `gate1_${section}_rejected`, detail: approverName });
    await saveSession(session);
    return NextResponse.json({ session });
  }

  if (decision !== "approve") {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
  }

  // Would approving this section complete both? If so, enforce the reconciliation
  // guard (a hard math invariant the Billing agent itself requires).
  // Anomalies are informational and never block the approval.
  const otherKey = section === "allocation" ? "g1_monthly" : "g1_allocation";
  const otherApproved = session.gates[otherKey]?.status === "approved";
  if (otherApproved && !reconciliationOk(session)) {
    return NextResponse.json(
      { error: "Pricing reconciliation failed — billing cannot run until allocation/monthly totals reconcile." },
      { status: 409 }
    );
  }

  session.gates[gateKey] = { status: "approved", approver_name: approverName, approved_at: nowIso, notes };
  session.updated_at = nowIso;
  session.audit_log.push({ ts: nowIso, event: `gate1_${section}_approved`, detail: approverName });

  // Both sections approved → finalize the overall gate and hand off to the
  // background worker. We do NOT call drive() inline: the request returns
  // immediately with status="billing", and the worker's drive-all tick (every
  // 5s) picks it up and submits Agent 4. This keeps the approval click snappy
  // and means closing the tab right after approving never strands the run.
  if (session.gates.g1_allocation.status === "approved" && session.gates.g1_monthly.status === "approved") {
    session.gates.g1_revenue_plan = { status: "approved", approver_name: approverName, approved_at: nowIso, notes };
    session.agent_outputs.billing.status = "pending";
    session.status = "billing";
    session.audit_log.push({ ts: nowIso, event: "gate1_approved", detail: "both sections approved; queued for billing" });
  }

  await saveSession(session);
  return NextResponse.json({ session });
}
