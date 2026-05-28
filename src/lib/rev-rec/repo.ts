import { getDb, COLLECTIONS } from "../mongo";
import type { Session } from "./types";
import type { SessionSummary } from "./ui";

export type { SessionSummary };

// Ensure the sessions collection has the indexes we rely on. Runs at most once
// per process — second call is a no-op via the cached promise.
let indexPromise: Promise<void> | null = null;
async function ensureIndexes(): Promise<void> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const db = await getDb();
      const c = db.collection<Session>(COLLECTIONS.sessions);
      // Sparse + unique so two concurrent Salesforce sync ticks can't create
      // two sessions for the same contract. Sparse because manual sessions
      // don't carry this field.
      await c.createIndex(
        { salesforce_contract_id: 1 },
        { unique: true, sparse: true, name: "salesforce_contract_id_unique" }
      );
    })().catch((e) => {
      indexPromise = null; // allow retry on next call
      throw e;
    });
  }
  return indexPromise;
}

async function col() {
  const db = await getDb();
  await ensureIndexes();
  return db.collection<Session>(COLLECTIONS.sessions);
}

export async function createSession(session: Session): Promise<void> {
  const c = await col();
  await c.insertOne(session);
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const c = await col();
  const doc = await c.findOne({ session_id: sessionId }, { projection: { _id: 0 } });
  return doc as Session | null;
}

export async function getSessionBySalesforceContractId(
  contractId: string,
): Promise<Session | null> {
  const c = await col();
  const doc = await c.findOne({ salesforce_contract_id: contractId }, { projection: { _id: 0 } });
  return doc as Session | null;
}

// All session statuses where the pipeline still has work to do on its own
// (parsing, an agent running, or queued to submit). Excludes terminal statuses
// (complete, failed, rejected) and gates (gate1, gate2) which need a human.
const BUSY_STATUSES: Session["status"][] = ["extracting", "reading", "pricing", "anomaly", "billing"];

export async function listBusySessions(): Promise<Session[]> {
  const c = await col();
  const docs = await c
    .find({ status: { $in: BUSY_STATUSES } }, { projection: { _id: 0 } })
    .toArray();
  return docs as unknown as Session[];
}

export async function saveSession(session: Session): Promise<void> {
  const c = await col();
  await c.replaceOne({ session_id: session.session_id }, session);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const c = await col();
  await c.deleteOne({ session_id: sessionId });
}

export async function listSessions(): Promise<SessionSummary[]> {
  const c = await col();
  const docs = await c
    .find({}, { projection: { "uploaded_files.text": 0, "agent_outputs.reader.raw": 0, "agent_outputs.pricing.raw": 0, "agent_outputs.anomaly.raw": 0, "agent_outputs.billing.raw": 0 } })
    // Newest customer at the top; updated_at is just a tiebreaker. Sorting on
    // started_at means a freshly added customer always lands at the top,
    // regardless of activity on older customers.
    .sort({ started_at: -1, updated_at: -1 })
    .toArray();

  return (docs as unknown as Session[]).map(toSummary);
}

function pick(obj: Record<string, unknown> | null | undefined, ...keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] != null) return obj[k];
  return undefined;
}

function toSummary(s: Session): SessionSummary {
  const readerJson = s.agent_outputs.reader.json;
  const pricingJson = s.agent_outputs.pricing.json;
  const anomalyJson = s.agent_outputs.anomaly.json;

  const totalRevenue =
    (pick(readerJson, "contract_total_value", "total_contract_value", "tcv", "contract_value", "total_value") as string | number | undefined) ??
    (pick(pricingJson, "contract_total_value", "total_contract_value", "tcv") as string | number | undefined) ??
    null;

  const projection = pick(pricingJson, "monthly_projection") as unknown[] | undefined;
  const anomalies = pick(anomalyJson, "anomalies") as unknown[] | undefined;

  return {
    session_id: s.session_id,
    company_name: s.company_name,
    status: s.status,
    started_at: s.started_at,
    updated_at: s.updated_at,
    file_count: s.uploaded_files?.length ?? 0,
    total_revenue: totalRevenue ?? null,
    projection_months: Array.isArray(projection) ? projection.length : null,
    anomaly_count: Array.isArray(anomalies) ? anomalies.length : null,
    invoice_count: s.gates?.g2_per_bill?.length ?? null,
    audit_count: s.audit_log?.length ?? 0,
    source: s.source,
  };
}
