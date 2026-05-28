import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/rev-rec/repo";
import { maybeComplete } from "@/lib/rev-rec/gates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/gate2 — approve ("send") or reject a single invoice.
// Mutates billing.json.invoices state (status + lock_state) per the render
// contract: the sent invoice becomes "paid"+"locked"; the next sequenced
// invoice flips to "actionable"+"unlocked".
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const invoiceKey = (body.invoice_id as string | undefined) ?? (body.invoice_number as string | undefined);
  const decision = (body.decision as string) ?? "approve";
  const nowIso = new Date().toISOString();

  if (!invoiceKey) {
    return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
  }

  // --- Update the agent's billing.json invoice state ---------------------
  const billingJson = session.agent_outputs.billing?.json as Record<string, unknown> | null;
  const invoices = Array.isArray(billingJson?.invoices) ? (billingJson!.invoices as Record<string, unknown>[]) : [];
  const matchKey = (inv: Record<string, unknown>) =>
    inv.invoice_id === invoiceKey || inv.invoice_number === invoiceKey || inv.id === invoiceKey;
  const target = invoices.find(matchKey);

  if (target) {
    if (decision === "reject") {
      target.status = "archived";
      target.lock_state = "locked";
    } else {
      target.status = "paid";
      target.lock_state = "locked";
      target.sent_at = nowIso;
      // Unlock the next sequenced invoice still scheduled.
      const next = invoices
        .filter((i) => i.status === "scheduled" || i.lock_state === "locked")
        .filter((i) => !matchKey(i))
        .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0))[0];
      if (next) {
        next.status = "actionable";
        next.lock_state = "unlocked";
      }
    }
  }

  // --- Keep the legacy g2_per_bill in sync (for maybeComplete & old UIs) ---
  let legacy = session.gates.g2_per_bill.find((b) => b.invoice_number === invoiceKey);
  if (!legacy) {
    legacy = { invoice_number: invoiceKey, status: "pending", approved_at: null, sent: false };
    session.gates.g2_per_bill.push(legacy);
  }
  if (decision === "reject") {
    legacy.status = "rejected";
  } else {
    legacy.status = "approved";
    legacy.approved_at = nowIso;
    legacy.sent = true;
  }

  session.updated_at = nowIso;
  session.audit_log.push({ ts: nowIso, event: `gate2_${decision}`, detail: invoiceKey });

  maybeComplete(session);
  await saveSession(session);
  return NextResponse.json({ session });
}
