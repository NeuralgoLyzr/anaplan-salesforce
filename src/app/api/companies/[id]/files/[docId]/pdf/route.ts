import { NextResponse } from "next/server";
import { getSession } from "@/lib/rev-rec/repo";
import { downloadDocument } from "@/lib/salesforce/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/companies/:id/files/:docId/pdf?download=1
//
// Streams the raw PDF for an uploaded file. Today only Salesforce-sourced
// files are previewable — the binary lives in Salesforce, not Mongo, and we
// proxy the download through the Python gateway using the file's
// content_version_id. Manual uploads return 404 because we never persisted
// the bytes.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const file = session.uploaded_files.find((f) => f.doc_id === docId);
  if (!file) return NextResponse.json({ error: "File not found on session" }, { status: 404 });

  const versionId = file.salesforce_content_version_id;
  const contractId = session.salesforce_contract_id;
  if (!versionId || !contractId) {
    return NextResponse.json(
      { error: "PDF preview unavailable — file is not stored in Salesforce." },
      { status: 404 },
    );
  }

  let buf: ArrayBuffer;
  try {
    buf = await downloadDocument(contractId, versionId);
  } catch (e) {
    return NextResponse.json(
      { error: `Salesforce download failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const safeName = file.filename.replace(/[\r\n"]/g, "").trim() || `${docId}.pdf`;
  const disposition = `${download ? "attachment" : "inline"}; filename="${safeName}"`;

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=60",
    },
  });
}
