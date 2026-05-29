import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/rev-rec/repo";
import { drive, startRerun } from "@/lib/rev-rec/orchestrator";
import { extractPdf } from "@/lib/rev-rec/pdf";
import { classifyDoc, makeDocId } from "@/lib/rev-rec/doc-type";
import { deleteDocument, uploadDocument } from "@/lib/salesforce/client";
import { llamaConfig } from "@/lib/config";
import { uploadFile, createParseJob } from "@/lib/llama/client";
import type { DocType, UploadedFile } from "@/lib/rev-rec/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/companies/:id/document-upload
// multipart/form-data fields:
//   file              — the new PDF
//   action_id         — the anomaly action being performed
//   operation         — "add" | "update"
//   source_doc_id     — required when operation === "update"; the UploadedFile.doc_id
//                       to replace
//   triggers_rerun    — "true" | "false"
//   doc_type          — optional override; otherwise derived
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const actionId = String(form.get("action_id") ?? "");
  const operation = String(form.get("operation") ?? "add");
  const sourceDocId = String(form.get("source_doc_id") ?? "") || null;
  const triggersRerun = String(form.get("triggers_rerun") ?? "false") === "true";
  const doctypeOverride = String(form.get("doc_type") ?? "") as DocType | "";

  if (!actionId) {
    return NextResponse.json({ error: "action_id is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }
  if (operation === "update" && !sourceDocId) {
    return NextResponse.json(
      { error: "source_doc_id is required for operation=update" },
      { status: 400 }
    );
  }

  const buf = await file.arrayBuffer();
  const filename = file.name;

  // Extract text now (we'll re-use it as the UploadedFile.text baseline; if
  // LlamaParse is enabled, a richer copy may replace it later).
  let text = "";
  let pageCount = 0;
  let language = "en";
  try {
    const extracted = await extractPdf(buf);
    text = extracted.text;
    pageCount = extracted.pageCount;
    language = extracted.language;
  } catch (e) {
    if (!llamaConfig.enabled()) {
      return NextResponse.json(
        { error: `Failed to read "${filename}": ${(e as Error).message}` },
        { status: 400 }
      );
    }
  }

  // Salesforce replace/upload (only when this session originated from SF).
  //
  // CRITICAL: the SF sync worker (scripts/worker.mjs → /api/salesforce/sync →
  // ingestSalesforceContract) dedupes by salesforce_contract_id. So once a
  // session exists for this contract, the worker will NEVER create a duplicate
  // dashboard entry from the file we're about to push to SF. The file we add
  // here is owned exclusively by this action; the worker treats it as part of
  // the already-ingested contract and silently skips.
  const isSf = session.source === "salesforce" && !!session.salesforce_contract_id;
  let sfIds: { content_document_id: string | null; content_version_id: string | null } = {
    content_document_id: null,
    content_version_id: null,
  };
  if (isSf) {
    try {
      // For "update": delete the existing SF doc tied to source_doc_id (if any).
      if (operation === "update" && sourceDocId) {
        const existing = session.uploaded_files.find((f) => f.doc_id === sourceDocId);
        if (existing?.salesforce_content_document_id) {
          await deleteDocument(id, existing.salesforce_content_document_id);
        }
      }
      const up = await uploadDocument(
        session.salesforce_contract_id as string,
        filename,
        buf,
        file.type || "application/pdf",
      );
      sfIds = {
        content_document_id: up.content_document_id ?? null,
        content_version_id: up.content_version_id ?? null,
      };
    } catch (e) {
      return NextResponse.json(
        { error: `Salesforce sync failed: ${(e as Error).message}` },
        { status: 502 }
      );
    }
  }

  // De-dup: if a file with the same SF content_document_id is already on the
  // session, treat this as a replace (not an append). Guards against a
  // double-add if the action box is fired twice or the SF sync worker has
  // already mirrored this file into the session.
  if (sfIds.content_document_id) {
    const dupIdx = session.uploaded_files.findIndex(
      (f) => f.salesforce_content_document_id === sfIds.content_document_id,
    );
    if (dupIdx !== -1 && operation !== "update") {
      // Behave as if the caller asked for an update on the duplicate.
      session.uploaded_files.splice(dupIdx, 1);
    }
  }

  // Decide doc_type
  let docType: DocType = "unknown";
  if (doctypeOverride === "SSA" || doctypeOverride === "OS" || doctypeOverride === "unknown") {
    docType = doctypeOverride;
  } else if (operation === "update" && sourceDocId) {
    const prev = session.uploaded_files.find((f) => f.doc_id === sourceDocId);
    docType = prev?.doc_type ?? classifyDoc(filename, text).type;
  } else {
    docType = classifyDoc(filename, text).type;
  }

  // Build the new UploadedFile record.
  // Note: we only kick off LlamaParse when the upload is going to trigger a
  // rerun. Without a rerun, the drive() loop's tickParsing never runs (it
  // only fires while status === "extracting"), so a LlamaParse job would
  // sit in RUNNING forever and the unpdf baseline text would be used anyway.
  const useLlama = llamaConfig.enabled() && triggersRerun;
  const newFile: UploadedFile = {
    filename,
    doc_id: makeDocId(docType, filename),
    doc_type: docType,
    language,
    page_count: pageCount,
    text,
    parser: useLlama ? "pending" : "unpdf",
    parse_status: useLlama ? "PENDING" : "COMPLETED",
    llama_file_id: null,
    llama_job_id: null,
    salesforce_content_document_id: sfIds.content_document_id,
    salesforce_content_version_id: sfIds.content_version_id,
  };

  // Optional LlamaParse upgrade — only when a rerun follows.
  if (useLlama) {
    try {
      const fileId = await uploadFile(buf, filename);
      const jobId = await createParseJob(fileId);
      newFile.llama_file_id = fileId;
      newFile.llama_job_id = jobId;
      newFile.parse_status = "RUNNING";
    } catch {
      newFile.parser = "unpdf";
      newFile.parse_status = "COMPLETED";
    }
  }

  // Mutate the file list — replace on update, append on add.
  if (operation === "update" && sourceDocId) {
    const idx = session.uploaded_files.findIndex((f) => f.doc_id === sourceDocId);
    if (idx === -1) {
      session.uploaded_files.push(newFile);
    } else {
      session.uploaded_files[idx] = newFile;
    }
  } else {
    session.uploaded_files.push(newFile);
  }

  const now = new Date().toISOString();
  session.updated_at = now;
  session.audit_log.push({
    ts: now,
    event: operation === "update" ? "document_replaced" : "document_added",
    detail: `${filename} → ${newFile.doc_id}`,
    meta: {
      source: session.source ?? "manual",
      pushed_to_salesforce: isSf,
      triggers_rerun: triggersRerun,
      total_files: session.uploaded_files.length,
    },
  });

  // Record the action as accepted.
  if (!session.action_items) session.action_items = {};
  session.action_items[actionId] = {
    status: "accepted",
    updated_at: now,
    by: null,
  };
  session.audit_log.push({ ts: now, event: "action_accepted", detail: actionId });

  // Kick off the rerun if requested.
  if (triggersRerun) {
    // Always re-run Reader + Pricing. We additionally fire the incremental
    // Anomaly stage so any new findings tied to this file get appended.
    startRerun(session, "reader_pricing_anomaly_incremental", [newFile.doc_id]);
    await drive(session);
  }

  await saveSession(session);
  return NextResponse.json({
    session,
    upload_summary: {
      filename,
      doc_id: newFile.doc_id,
      operation,
      pushed_to_salesforce: isSf,
      triggers_rerun: triggersRerun,
      total_files: session.uploaded_files.length,
    },
  });
}
