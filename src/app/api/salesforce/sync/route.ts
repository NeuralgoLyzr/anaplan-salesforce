import { NextResponse } from "next/server";
import { salesforceConfig } from "@/lib/config";
import { listContracts } from "@/lib/salesforce/client";
import { ingestSalesforceContract } from "@/lib/salesforce/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow enough room for first-run bulk ingestion. Vercel cuts at 60s on hobby
// plans; on long-lived hosts this is just a hint.
export const maxDuration = 300;

type SyncSummary = {
  pulled: number;
  ingested: number;
  skipped: number;
  errors: { contract_id: string | null; message: string }[];
  details: { contract_id: string | null; outcome: string; session_id?: string }[];
};

export async function POST(req: Request) {
  const secret = salesforceConfig.syncSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "SALESFORCE_SYNC_SECRET is not configured on the server" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const presented = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (presented !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let contracts;
  try {
    contracts = await listContracts();
  } catch (e) {
    return NextResponse.json(
      { error: `failed to list contracts: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const summary: SyncSummary = {
    pulled: contracts.length,
    ingested: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  for (const contract of contracts) {
    try {
      const result = await ingestSalesforceContract(contract);
      if (result.ingested) {
        summary.ingested += 1;
        summary.details.push({
          contract_id: contract.salesforce_id,
          outcome: `ingested (${result.status})`,
          session_id: result.session_id,
        });
      } else {
        summary.skipped += 1;
        summary.details.push({
          contract_id: contract.salesforce_id,
          outcome: `skipped: ${result.reason}`,
        });
      }
    } catch (e) {
      summary.errors.push({
        contract_id: contract.salesforce_id,
        message: (e as Error).message,
      });
    }
  }

  return NextResponse.json(summary);
}
