import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/rev-rec/repo";
import { getInvoices } from "@/lib/rev-rec/view";
import { InvoicePdfDocument } from "@/components/rev-rec/InvoicePdfDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/companies/:id/invoices/:invoiceId/pdf
// Renders the InvoicePdfDocument for a single invoice to a real PDF buffer.
// Used by:
//   - the email composer's download button (fetch → Blob URL)
//   - the send-email route (re-rendered server-side to attach to SES)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> },
) {
  const { id, invoiceId } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const inv = getInvoices(session).find((i) => i.id === invoiceId);
  if (!inv) return NextResponse.json({ error: "invoice not found" }, { status: 404 });

  let buf: Buffer;
  try {
    buf = await renderToBuffer(<InvoicePdfDocument inv={inv} />);
  } catch (e) {
    return NextResponse.json(
      { error: `PDF render failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeFilename(invoiceId)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function safeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "invoice";
}
