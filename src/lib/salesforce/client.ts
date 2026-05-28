// Typed HTTP client for the FastAPI Salesforce gateway (anaplan-salesforce-backend).
// We intentionally do NOT talk to Salesforce directly from Next.js — all OAuth
// and SOQL lives on the Python side. This client just knows how to call its
// REST endpoints.

import { salesforceConfig } from "../config";

// Subset of ContractRecord (FastAPI Pydantic model) that we actually consume.
// The Python side returns more fields; we type the ones we use.
export type SfContract = {
  local_id: string;
  salesforce_id: string | null;
  account_id: string;
  start_date: string;
  contract_term: number;
  status: string;
  customer_signed_date: string | null;
  description: string | null;
  external_id: string | null;
  sync_status: "synced" | "skipped" | "failed";
  // Raw Salesforce response — contains Account.Name etc. when sourced from SF.
  salesforce_response: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SfContractDocument = {
  kind: "agreement" | "contact" | "order_schedule" | "supporting_document";
  filename: string;
  content_type: string;
  size_bytes: number;
  text_preview: string;
  salesforce_content_version_id: string | null;
  salesforce_content_document_id: string | null;
  salesforce_file_url: string | null;
  salesforce_download_url: string | null;
  created_at: string;
};

function base(): string {
  return salesforceConfig.backendUrl();
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Salesforce gateway ${res.status} ${res.statusText} on ${url}: ${body.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

// GET /api/contracts on the FastAPI side — triggers a Salesforce SOQL sync and
// returns the resulting ContractRecord list.
export async function listContracts(): Promise<SfContract[]> {
  return jsonFetch<SfContract[]>(`${base()}/api/contracts`);
}

// GET /api/contracts/{id}/documents — lists the PDFs (ContentDocumentLink-attached
// files) for a contract, including SF download URLs and content-version IDs.
export async function listContractDocuments(contractLocalId: string): Promise<SfContractDocument[]> {
  return jsonFetch<SfContractDocument[]>(`${base()}/api/contracts/${encodeURIComponent(contractLocalId)}/documents`);
}

// GET /api/contracts/{id}/documents/{content_version_id}/download — proxy that
// streams the PDF bytes using the stored Salesforce access token. This avoids
// the cookie-based /sfc/servlet.shepherd download URL.
export async function downloadDocument(
  contractLocalId: string,
  contentVersionId: string,
): Promise<ArrayBuffer> {
  const url = `${base()}/api/contracts/${encodeURIComponent(contractLocalId)}/documents/${encodeURIComponent(contentVersionId)}/download`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Salesforce gateway ${res.status} ${res.statusText} on ${url}: ${body.slice(0, 500)}`);
  }
  return res.arrayBuffer();
}

// Convenience: pull a human-friendly account name out of the raw SOQL snapshot.
// list_contracts() in the Python side stores the full snapshot on salesforce_response.
export function accountNameFromContract(contract: SfContract): string | null {
  const snap = contract.salesforce_response;
  if (!snap) return null;
  const account = snap["Account"];
  if (account && typeof account === "object" && account !== null) {
    const name = (account as Record<string, unknown>)["Name"];
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}
