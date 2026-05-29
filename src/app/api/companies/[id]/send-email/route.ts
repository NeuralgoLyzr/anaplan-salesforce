import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/rev-rec/repo";
import { sendActionEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/send-email
// Body: { action_id, to, subject, body, from_name? }
// Sends the email through AWS SES SMTP and records the action as accepted.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = await req.json().catch(() => ({} as Record<string, unknown>));
  const actionId = String(payload.action_id ?? "");
  const to = String(payload.to ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  const body = String(payload.body ?? "");
  const fromName = typeof payload.from_name === "string" ? payload.from_name : undefined;

  if (!actionId) return NextResponse.json({ error: "action_id is required" }, { status: 400 });
  if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });
  if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "to is not a valid email address" }, { status: 400 });
  }

  let messageId: string;
  try {
    const result = await sendActionEmail({ to, subject, text: body, fromName });
    messageId = result.message_id;
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    return NextResponse.json({ error: `SES send failed: ${msg}` }, { status: 502 });
  }

  const now = new Date().toISOString();
  if (!session.action_items) session.action_items = {};
  session.action_items[actionId] = { status: "accepted", updated_at: now, by: null };
  session.updated_at = now;
  session.audit_log.push({
    ts: now,
    event: "action_accepted",
    detail: actionId,
    meta: { kind: "send_email", to, subject, ses_message_id: messageId },
  });

  await saveSession(session);
  return NextResponse.json({ session, ses_message_id: messageId });
}
