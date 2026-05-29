import { createSessionFromPdfBuffers, deriveNameFromFiles, type CreateFromPdfsResult } from "../rev-rec/createFromPdfs";
import { getSessionBySalesforceContractId } from "../rev-rec/repo";
import {
  accountNameFromContract,
  downloadDocument,
  listContractDocuments,
  type SfContract,
  type SfContractDocument,
} from "./client";

export type IngestResult =
  | { ingested: true; session_id: string; status: CreateFromPdfsResult["status"] }
  | { ingested: false; reason: string };

// Ingest a single Salesforce contract:
//   1. Skip if we've already created a Session for it (one-time semantics).
//   2. Fetch its attached documents from the FastAPI side.
//   3. Download each PDF via the gateway proxy.
//   4. Hand off to createSessionFromPdfBuffers, which extracts text, creates the
//      Session, and starts the Lyzr pipeline.
//
// IMPORTANT: this function MUST be strictly idempotent per salesforce_contract_id.
// If a Session already exists for the contract, return early WITHOUT touching
// it — files pushed to that contract by /api/companies/[id]/document-upload
// (anomaly action box) are owned by the existing session. Mutating the session
// from here would race with the action-driven upload and could surface as a
// duplicate "new entry" in the dashboard.
export async function ingestSalesforceContract(contract: SfContract): Promise<IngestResult> {
  if (!contract.salesforce_id) {
    return { ingested: false, reason: "contract has no salesforce_id (not synced)" };
  }

  const existing = await getSessionBySalesforceContractId(contract.salesforce_id);
  if (existing) {
    // Session already exists. The SF sync worker is read-only against the
    // existing session — file additions go through the action upload route.
    return { ingested: false, reason: "already-ingested" };
  }

  const docs = await listContractDocuments(contract.local_id);
  const pdfDocs = docs.filter(isLikelyPdf);
  if (pdfDocs.length === 0) {
    return { ingested: false, reason: "no PDF documents attached" };
  }

  const pdfs: {
    filename: string;
    buf: ArrayBuffer;
    salesforce_content_document_id?: string | null;
    salesforce_content_version_id?: string | null;
  }[] = [];
  for (const doc of pdfDocs) {
    if (!doc.salesforce_content_version_id) {
      return { ingested: false, reason: `document "${doc.filename}" missing content_version_id` };
    }
    const buf = await downloadDocument(contract.local_id, doc.salesforce_content_version_id);
    pdfs.push({
      filename: ensurePdfFilename(doc.filename),
      buf,
      salesforce_content_document_id: doc.salesforce_content_document_id,
      salesforce_content_version_id: doc.salesforce_content_version_id,
    });
  }

  const { name: company_name, source: nameSource } = pickCompanyName(contract, pdfs.map((p) => p.filename));

  const result = await createSessionFromPdfBuffers({
    company_name,
    pdfs,
    meta: {
      source: "salesforce",
      salesforce_contract_id: contract.salesforce_id,
      salesforce_account_id: contract.account_id,
    },
  });

  // Reader (Agent 1) may later refine company_name from contract text via
  // deriveCompanyName in the orchestrator — that's an upgrade, not a fallback.
  // We just log here which initial source we used so debugging is easy.
  void nameSource;
  return { ingested: true, session_id: result.session_id, status: result.status };
}

// Resolves a human-friendly company name from a Salesforce contract, using a
// cascade of fallbacks. Returns both the name and which fallback won, for audit.
//
// Order, best → worst:
//   1. salesforce_response.Account.Name  ← the actual SOQL join. Best when set.
//   2. metadata.account_name             ← Python sync explicitly captures Account.Name
//                                          into metadata; sometimes present even when
//                                          the raw snapshot field is null (different
//                                          query path in the Python side).
//   3. PDF filename heuristic            ← real customer name is usually in the file
//                                          name (e.g. "Proquire_Anaplan_OS_...pdf").
//   4. ContractNumber                    ← human-readable SF contract identifier
//                                          ("00000123").
//   5. external_id                       ← typically the ContractNumber too, but set
//                                          explicitly by the Python sync.
//   6. "Account {id}"                    ← pretty-print the raw ID rather than dumping
//                                          it bare. Last resort; the row will get
//                                          renamed once Agent 1 finishes anyway.
function pickCompanyName(
  contract: SfContract,
  filenames: string[],
): { name: string; source: "account.name" | "metadata.account_name" | "filename" | "contract_number" | "external_id" | "account_id_fallback" } {
  const fromAccount = accountNameFromContract(contract);
  if (fromAccount) return { name: fromAccount, source: "account.name" };

  const metaName = (contract.metadata?.account_name);
  if (typeof metaName === "string" && metaName.trim()) {
    return { name: metaName.trim(), source: "metadata.account_name" };
  }

  if (filenames.length > 0) {
    const derived = deriveNameFromFiles(filenames);
    // deriveNameFromFiles always returns something; only accept it if it found
    // a real prefix (not the literal "Untitled Customer" placeholder).
    if (derived && derived !== "Untitled Customer") {
      return { name: derived, source: "filename" };
    }
  }

  const snap = contract.salesforce_response;
  const contractNumber = snap && typeof snap === "object" ? snap["ContractNumber"] : undefined;
  if (typeof contractNumber === "string" && contractNumber.trim()) {
    return { name: `Contract ${contractNumber.trim()}`, source: "contract_number" };
  }

  if (contract.external_id && contract.external_id.trim()) {
    return { name: `Contract ${contract.external_id.trim()}`, source: "external_id" };
  }

  return { name: `Account ${contract.account_id}`, source: "account_id_fallback" };
}

function isLikelyPdf(doc: SfContractDocument): boolean {
  if (doc.content_type?.toLowerCase().includes("pdf")) return true;
  return doc.filename.toLowerCase().endsWith(".pdf");
}

// Some Salesforce ContentDocument titles arrive without a file extension because
// FileExtension came back blank. The downstream PDF extractor rejects anything
// that doesn't end in .pdf, so attach the extension when we're confident.
function ensurePdfFilename(filename: string): string {
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}
