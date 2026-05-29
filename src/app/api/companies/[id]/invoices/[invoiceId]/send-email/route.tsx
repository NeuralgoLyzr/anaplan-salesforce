import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession, saveSession } from "@/lib/rev-rec/repo";
import { maybeComplete } from "@/lib/rev-rec/gates";
import { sendActionEmail } from "@/lib/email/send";
import { getInvoices } from "@/lib/rev-rec/view";
import { InvoicePdfDocument } from "@/components/rev-rec/InvoicePdfDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/invoices/:invoiceId/send-email
//
// Body: { to, subject, body }  — the composed message after the user reviewed
// the template-substituted draft. The PDF is regenerated server-side from the
// invoice JSON so we don't trust a client-uploaded blob and so the rendered
// document matches the download endpoint byte-for-byte.
//
// On success:
//   1. SES sends the email with the invoice PDF attached.
//   2. The session's billing.json invoice is marked paid/locked, the next
//      sequenced invoice is unlocked, the legacy g2_per_bill mirror is updated,
//      and the gate state may advance to "complete" via maybeComplete().
//   3. An audit row is appended capturing the SES message id and recipient.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> },
) {
  const { id, invoiceId } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const payload = await req.json().catch(() => ({} as Record<string, unknown>));
  const to = String(payload.to ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  const body = String(payload.body ?? "");

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "to is not a valid email address" }, { status: 400 });
  }
  if (!subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });
  if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const inv = getInvoices(session).find((i) => i.id === invoiceId);
  if (!inv) return NextResponse.json({ error: "invoice not found" }, { status: 404 });

  // Render the PDF buffer (same component as the download endpoint).
  let pdf: Buffer;
  try {
    pdf = await renderToBuffer(<InvoicePdfDocument inv={inv} />);
  } catch (e) {
    return NextResponse.json(
      { error: `PDF render failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  // Send via SES with the PDF attached.
  let messageId: string;
  try {
    const result = await sendActionEmail({
      to,
      subject,
      text: body,
      fromName: inv.vendor?.name ?? undefined,
      attachments: [
        {
          filename: `${invoiceId}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
    messageId = result.message_id;
  } catch (e) {
    return NextResponse.json(
      { error: `SES send failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  // Mark the invoice paid + unlock next, mirroring /gate2 behaviour.
  const nowIso = new Date().toISOString();
  const billingJson = session.agent_outputs.billing?.json as Record<string, unknown> | null;
  const invoices = Array.isArray(billingJson?.invoices)
    ? (billingJson!.invoices as Record<string, unknown>[])
    : [];
  const matchKey = (row: Record<string, unknown>) =>
    row.invoice_id === invoiceId || row.invoice_number === invoiceId || row.id === invoiceId;
  const target = invoices.find(matchKey);
  if (target) {
    target.status = "paid";
    target.lock_state = "locked";
    target.sent_at = nowIso;
    target.sent_to = to;
    target.ses_message_id = messageId;
    // Find the next invoice to unlock. CRITICAL: filter strictly on
    // status === "scheduled" — NOT on lock_state === "locked", because paid
    // invoices are also locked. Including them would let a later send revert
    // an earlier paid invoice back to "actionable" (the lowest-sequence paid
    // invoice would win the sort). See bug history: ONT 001 got un-paid when
    // the user sent 002.
    const next = invoices
      .filter((i) => i.status === "scheduled" && !matchKey(i))
      .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0))[0];
    if (next) {
      next.status = "actionable";
      next.lock_state = "unlocked";
    }
  }

  // Legacy mirror for maybeComplete() + older UIs.
  let legacy = session.gates.g2_per_bill.find((b) => b.invoice_number === invoiceId);
  if (!legacy) {
    legacy = { invoice_number: invoiceId, status: "pending", approved_at: null, sent: false };
    session.gates.g2_per_bill.push(legacy);
  }
  legacy.status = "approved";
  legacy.approved_at = nowIso;
  legacy.sent = true;

  session.updated_at = nowIso;
  session.audit_log.push({
    ts: nowIso,
    event: "invoice_emailed",
    detail: invoiceId,
    meta: { to, subject, ses_message_id: messageId, pdf_bytes: pdf.byteLength },
  });

  maybeComplete(session);
  await saveSession(session);
  return NextResponse.json({ session, ses_message_id: messageId });
}
