import { randomUUID } from "crypto";
import { extractPdf } from "./pdf";
import { classifyDoc, assignDocTypes, makeDocId } from "./doc-type";
import { newSession, type Session, type SessionStatus, type UploadedFile } from "./types";
import { createSession, saveSession } from "./repo";
import { drive } from "./orchestrator";
import { llamaConfig } from "../config";
import { uploadFile, createParseJob } from "../llama/client";

export type PdfInput = {
  filename: string;
  buf: ArrayBuffer;
  // Optional SF identifiers — present when this PDF came from Salesforce
  // (ingested via /api/salesforce/sync). Carried onto the UploadedFile so
  // later document-update actions can replace the right Salesforce record.
  salesforce_content_document_id?: string | null;
  salesforce_content_version_id?: string | null;
};

export type SessionMeta = {
  source?: Session["source"];
  salesforce_contract_id?: string;
  salesforce_account_id?: string;
};

export type CreateFromPdfsResult = {
  session_id: string;
  status: SessionStatus;
};

// Shared logic for turning a set of PDF buffers into a running Session.
// Used by both the manual upload route and the Salesforce auto-ingest path.
//
// Throws on:
//   - non-PDF input
//   - unparseable PDF (no baseline text and no LlamaParse job to fall back on)
export async function createSessionFromPdfBuffers(args: {
  company_name?: string;
  pdfs: PdfInput[];
  meta?: SessionMeta;
}): Promise<CreateFromPdfsResult> {
  if (args.pdfs.length === 0) {
    throw new Error("No files provided");
  }

  const llamaEnabled = llamaConfig.enabled();

  // Extract text (unpdf baseline). With LlamaParse enabled we tolerate a baseline
  // failure (image-only PDFs); without it we must succeed here.
  const extracted: {
    filename: string;
    buf: ArrayBuffer;
    text: string;
    pageCount: number;
    language: string;
    salesforce_content_document_id?: string | null;
    salesforce_content_version_id?: string | null;
  }[] = [];
  for (const file of args.pdfs) {
    if (!file.filename.toLowerCase().endsWith(".pdf")) {
      throw new Error(`Only PDF files are accepted. Rejected: ${file.filename}`);
    }
    const sfMeta = {
      salesforce_content_document_id: file.salesforce_content_document_id ?? null,
      salesforce_content_version_id: file.salesforce_content_version_id ?? null,
    };
    try {
      const { text, pageCount, language } = await extractPdf(file.buf);
      extracted.push({ filename: file.filename, buf: file.buf, text, pageCount, language, ...sfMeta });
    } catch (e) {
      if (!llamaEnabled) {
        throw new Error(`Failed to read "${file.filename}": ${(e as Error).message}`);
      }
      extracted.push({ filename: file.filename, buf: file.buf, text: "", pageCount: 0, language: "en", ...sfMeta });
    }
  }

  const classified = extracted.map((e) => ({ filename: e.filename, classification: classifyDoc(e.filename, e.text) }));
  const docTypes = assignDocTypes(classified);

  const uploaded_files: UploadedFile[] = extracted.map((e, i) => {
    const doc_type = docTypes[i];
    return {
      filename: e.filename,
      doc_id: makeDocId(doc_type, e.filename),
      doc_type,
      language: e.language,
      page_count: e.pageCount,
      text: e.text,
      parser: llamaEnabled ? "pending" : "unpdf",
      parse_status: llamaEnabled ? "PENDING" : "COMPLETED",
      llama_file_id: null,
      llama_job_id: null,
      salesforce_content_document_id: e.salesforce_content_document_id ?? null,
      salesforce_content_version_id: e.salesforce_content_version_id ?? null,
    };
  });

  const company_name = (args.company_name?.trim() || "") || deriveNameFromFiles(extracted.map((e) => e.filename));

  const session = newSession({
    session_id: randomUUID(),
    company_name,
    uploaded_files,
  });

  if (args.meta) {
    if (args.meta.source) session.source = args.meta.source;
    if (args.meta.salesforce_contract_id) session.salesforce_contract_id = args.meta.salesforce_contract_id;
    if (args.meta.salesforce_account_id) session.salesforce_account_id = args.meta.salesforce_account_id;
  }

  // Submit LlamaParse jobs in parallel using the buffers we still hold.
  if (llamaEnabled) {
    await Promise.all(
      session.uploaded_files.map(async (f, i) => {
        try {
          const fileId = await uploadFile(extracted[i].buf, f.filename);
          const jobId = await createParseJob(fileId);
          f.llama_file_id = fileId;
          f.llama_job_id = jobId;
          f.parse_status = "RUNNING";
          session.audit_log.push({ ts: new Date().toISOString(), event: "parse_submitted", detail: `${f.filename} (job ${jobId})` });
        } catch (e) {
          f.parser = "unpdf";
          f.parse_status = "COMPLETED";
          session.audit_log.push({ ts: new Date().toISOString(), event: "parse_submit_failed_fallback_unpdf", detail: `${f.filename}: ${(e as Error).message}` });
        }
      })
    );
  }

  const unparseable = session.uploaded_files.find((f) => f.parse_status !== "RUNNING" && !f.text.trim());
  if (unparseable) {
    throw new Error(`Could not extract text from "${unparseable.filename}" (likely image-only; needs OCR).`);
  }

  const anyParsing = session.uploaded_files.some((f) => f.parse_status === "RUNNING");
  session.status = anyParsing ? "extracting" : "reading";

  await createSession(session);
  await drive(session);
  await saveSession(session);

  return { session_id: session.session_id, status: session.status };
}

export function deriveNameFromFiles(filenames: string[]): string {
  const stems = filenames.map((f) => f.replace(/\.[^.]+$/, ""));
  if (stems.length === 1) return cleanup(stems[0]);

  let prefix = stems[0];
  for (const s of stems.slice(1)) {
    while (prefix && !s.toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
    }
  }
  const cleaned = cleanup(prefix);
  return cleaned.length >= 3 ? cleaned : cleanup(stems[0]);
}

function cleanup(s: string): string {
  return s
    .replace(/[_\-]+/g, " ")
    .replace(/\b(ssa|os|order|schedule|master|agreement|contract|subscription|final|signed|v\d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || "Untitled Customer";
}
