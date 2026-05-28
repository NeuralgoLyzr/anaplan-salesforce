import type { Session } from "./types";

// Mark the session complete as soon as the user has sent at least one invoice
// (or, for a session with no invoices, once journal entries are posted).
// Remaining invoices stay "actionable" for future billing cycles — the user
// can come back and send them later without the session still showing as
// "Action needed".
export function maybeComplete(session: Session): void {
  if (session.status !== "gate2") return;

  const bills = session.gates.g2_per_bill;
  const invoices = (session.agent_outputs.billing?.json as Record<string, unknown> | null)?.invoices as
    | Record<string, unknown>[]
    | undefined;

  const anyPaidNew = Array.isArray(invoices) && invoices.some((i) => i.status === "paid");
  const anyApprovedLegacy = bills.some((b) => b.status === "approved" || b.sent);
  const anyInvoiceSent = anyPaidNew || anyApprovedLegacy;

  // Sessions that never had invoices (edge case) still complete on JE post.
  const noInvoicesAtAll = !Array.isArray(invoices) && bills.length === 0;
  const jePosted = session.gates.g4_je_post.status === "approved";

  if (anyInvoiceSent || (noInvoicesAtAll && jePosted)) {
    session.status = "complete";
    session.updated_at = new Date().toISOString();
    session.audit_log.push({ ts: session.updated_at, event: "session_complete" });
  }
}
