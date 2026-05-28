import { lyzrConfig, anaplanConfig, billingConfig } from "../config";
import { submitTask, getTaskStatus, LyzrError } from "../lyzr/client";
import { getParseJob, extractParseText } from "../llama/client";
import { parseAgentResponse } from "../lyzr/parse";
import type { AgentKey, AgentOutput, Session, SessionStatus, PerBillGate } from "./types";

// ─── Status ⇆ agent mapping ──────────────────────────────────────

const STATUS_TO_AGENT: Partial<Record<SessionStatus, AgentKey>> = {
  reading: "reader",
  pricing: "pricing",
  anomaly: "anomaly",
  billing: "billing",
};

const AGENT_ID: Record<AgentKey, () => string> = {
  reader: lyzrConfig.agents.reader,
  pricing: lyzrConfig.agents.pricing,
  anomaly: lyzrConfig.agents.anomaly,
  billing: lyzrConfig.agents.billing,
};

const STATUS_FOR_AGENT: Record<AgentKey, SessionStatus> = {
  reader: "reading",
  pricing: "pricing",
  anomaly: "anomaly",
  billing: "billing",
};

export function currentAgent(session: Session): AgentKey | null {
  return STATUS_TO_AGENT[session.status] ?? null;
}

// ─── Small helpers ───────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function audit(session: Session, event: string, extra?: Partial<{ agent: AgentKey; detail: string; meta: Record<string, unknown> }>) {
  session.audit_log.push({ ts: now(), event, ...extra });
  session.updated_at = now();
}

function recordError(session: Session, agent: AgentKey | undefined, code: string, detail: string) {
  session.errors.push({ agent, code, detail, ts: now() });
  audit(session, "error", { agent, detail: `${code}: ${detail}` });
}

function pick(obj: Record<string, unknown> | null | undefined, ...keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] != null) return obj[k];
  return undefined;
}

// ─── Payload builders (per the Implementation Guide) ─────────────

function buildReaderDocs(session: Session) {
  const ssaDocs = session.uploaded_files.filter((f) => f.doc_type === "SSA");
  const hasMaster = ssaDocs.length >= 1 && session.uploaded_files.length >= 2;

  const ssa = hasMaster
    ? { doc_id: ssaDocs[0].doc_id, doc_name: ssaDocs[0].filename, text: ssaDocs[0].text, language: ssaDocs[0].language }
    : null;

  const ssaId = ssa ? ssaDocs[0].doc_id : null;
  const order_schedules = session.uploaded_files
    .filter((f) => f.doc_id !== ssaId)
    .map((f) => ({ doc_id: f.doc_id, doc_name: f.filename, text: f.text, language: f.language }));

  return { ssa, order_schedules };
}

export function buildPayload(session: Session, agent: AgentKey): unknown {
  const { reader, pricing, anomaly } = session.agent_outputs;

  switch (agent) {
    case "reader":
      return buildReaderDocs(session);

    case "pricing":
      return {
        contract_brief_markdown: reader.markdown ?? "",
        contract_json: reader.json ?? {},
        anaplan_config: anaplanConfig(),
      };

    case "anomaly":
      return {
        reader_brief_markdown: reader.markdown ?? "",
        reader_json: reader.json ?? {},
        pricing_brief_markdown: pricing.markdown ?? "",
        pricing_json: pricing.json ?? {},
      };

    case "billing": {
      const g1 = session.gates.g1_revenue_plan;
      const cfg = billingConfig();
      return {
        reader_brief_markdown: reader.markdown ?? "",
        reader_json: reader.json ?? {},
        pricing_brief_markdown: pricing.markdown ?? "",
        pricing_json: pricing.json ?? {},
        anomaly_json: anomaly.json ?? {},
        approval: {
          gate: "G1",
          approved: g1.status === "approved",
          approver_name: g1.approver_name,
          approved_at: g1.approved_at,
          approver_notes: g1.notes,
        },
        billing_config: {
          preview_cycle_count: cfg.preview_cycle_count,
          today: now().slice(0, 10),
          vendor_invoice_prefix: cfg.vendor_invoice_prefix,
        },
      };
    }
  }
}

// ─── Submit ──────────────────────────────────────────────────────

export async function submitAgent(session: Session, agent: AgentKey): Promise<void> {
  const out = session.agent_outputs[agent];
  const payload = buildPayload(session, agent);

  out.status = "running";
  out.attempts += 1;
  out.ran_at = now();
  out.error_code = null;
  out.error_detail = null;

  session.status = STATUS_FOR_AGENT[agent];

  try {
    const result = await submitTask(AGENT_ID[agent](), payload);
    out.task_id = result.taskId;
    out.session_id = result.sessionId;
    audit(session, "agent_submitted", { agent, meta: { task_id: result.taskId, lyzr_session_id: result.sessionId } });

    // Some deployments answer synchronously — finish immediately if so.
    // applyCompletion is sync (no further network) and just sets the next
    // agent to "pending"; the driving loop submits it on the next iteration.
    if (!result.taskId && result.immediateText) {
      applyCompletion(session, agent, result.immediateText);
    }
  } catch (e) {
    const err = e as LyzrError;
    handleAgentFailure(session, agent, "SUBMIT_FAILED", err.message);
  }
}

// ─── Poll tick (state machine) ───────────────────────────────────
// Called by the poll API route. Advances the pipeline by at most one step:
// checks the in-flight agent, and on completion stores the output and kicks
// off the next agent (or transitions to a gate).
export async function tick(session: Session): Promise<void> {
  const agent = currentAgent(session);
  if (!agent) return; // at a gate or terminal — nothing to poll

  const out = session.agent_outputs[agent];

  // Only poll a running agent. Pending agents are submitted by maybeSubmitNext.
  if (out.status !== "running" || !out.task_id) return;

  let status;
  try {
    status = await getTaskStatus(out.task_id);
  } catch (e) {
    handleTransportFailure(session, agent, (e as Error).message);
    return;
  }

  if (status.state === "running") return;

  if (status.state === "failed") {
    handleTransportFailure(session, agent, "Lyzr task reported failed");
    return;
  }

  // done
  applyCompletion(session, agent, status.text ?? "");
}

function finalizeTiming(out: AgentOutput) {
  out.completed_at = now();
  if (out.ran_at) out.duration_ms = Date.parse(out.completed_at) - Date.parse(out.ran_at);
}

// ─── Completion handling per agent ───────────────────────────────

// Sync: processes a finished agent response and decides the next state.
// Never makes network calls — sets the next agent to "pending" (the driving
// loop submits it) or marks a retry by setting this agent back to "pending".
function applyCompletion(session: Session, agent: AgentKey, text: string) {
  const out = session.agent_outputs[agent];
  out.raw = text;
  const parsed = parseAgentResponse(text);
  out.markdown = parsed.markdown;
  out.json = parsed.json;

  // Agent-reported structured error.
  if (parsed.agentError) {
    failOrSoften(session, agent, parsed.agentError.error_code, parsed.agentError.error_detail);
    return;
  }

  // Could not parse a JSON tail.
  if (parsed.parseError || !parsed.json) {
    // Reader gets one retry on malformed output (per the Implementation Guide).
    if (agent === "reader" && out.attempts < 2) {
      out.status = "pending"; // status stays "reading"; loop re-submits
      audit(session, "agent_retry", { agent, detail: `malformed output: ${parsed.parseError}` });
      return;
    }
    failOrSoften(session, agent, "MALFORMED_OUTPUT", parsed.parseError ?? "No JSON tail");
    return;
  }

  // Success.
  out.status = "complete";
  finalizeTiming(out);
  audit(session, "agent_complete", { agent, meta: { duration_ms: out.duration_ms } });

  advanceAfter(session, agent);
}

// Fail the session, except Anomaly which is non-fatal (proceed to Gate 1).
function failOrSoften(session: Session, agent: AgentKey, code: string, detail: string) {
  const out = session.agent_outputs[agent];
  out.status = "failed";
  out.error_code = code;
  out.error_detail = detail;
  finalizeTiming(out);
  if (agent === "anomaly") {
    audit(session, "agent_error_nonfatal", { agent, detail: code });
    session.status = "gate1";
    return;
  }
  recordError(session, agent, code, detail);
  session.status = "failed";
}

// Decide what runs next after a successful agent completion.
// NOTE: this is sync (mutating); the actual next submit is fired by the caller
// via maybeSubmitNext to keep tick's network calls explicit.
function advanceAfter(session: Session, agent: AgentKey) {
  switch (agent) {
    case "reader": {
      const name = deriveCompanyName(session);
      if (name) session.company_name = name;
      session.agent_outputs.pricing.status = "pending";
      session.status = "pricing";
      break;
    }
    case "pricing": {
      session.agent_outputs.anomaly.status = "pending";
      session.status = "anomaly";
      break;
    }
    case "anomaly": {
      session.status = "gate1";
      break;
    }
    case "billing": {
      session.gates.g2_per_bill = extractInvoiceGates(session);
      session.status = "gate2";
      break;
    }
  }
}

// After tick/gate mutations, submit the next pending agent if the status calls
// for one. Returns true if a submission was kicked off.
export async function maybeSubmitNext(session: Session): Promise<boolean> {
  const agent = currentAgent(session);
  if (!agent) return false;
  const out = session.agent_outputs[agent];
  if (out.status === "pending") {
    await submitAgent(session, agent);
    return true;
  }
  return false;
}

// Single entry point for routes: advances PDF parsing, polls the in-flight
// agent, advances on completion, and submits the next agent — looping until the
// session reaches a stable state (parsing/running agent, gate, or terminal).
export async function drive(session: Session): Promise<void> {
  let guard = 0;
  while (guard++ < 8) {
    const before = stateSignature(session);

    if (session.status === "extracting") {
      await tickParsing(session);
    } else {
      await tick(session);
    }
    const submitted = await maybeSubmitNext(session);

    if (!submitted && stateSignature(session) === before) break;
  }
}

// Captures the progress-relevant state so the drive loop knows when to stop.
function stateSignature(session: Session): string {
  const agents = (["reader", "pricing", "anomaly", "billing"] as const)
    .map((a) => `${a}:${session.agent_outputs[a].status}`)
    .join(",");
  const parse = session.uploaded_files.map((f) => f.parse_status).join(",");
  return `${session.status}|${agents}|${parse}`;
}

// ─── Parsing phase (LlamaParse primary, unpdf fallback) ──────────
// Polls each file's LlamaParse job. On COMPLETED, swaps in the richer text;
// on FAILED, keeps the unpdf baseline already stored at upload. When every
// file is terminal, transitions to "reading" so Agent 1 can run.
async function tickParsing(session: Session): Promise<void> {
  const pending = session.uploaded_files.filter(
    (f) => f.parse_status === "RUNNING" || f.parse_status === "PENDING"
  );

  for (const f of pending) {
    if (!f.llama_job_id) {
      f.parse_status = "FAILED";
      f.parser = "unpdf";
      continue;
    }
    try {
      const job = await getParseJob(f.llama_job_id);
      if (job.status === "COMPLETED") {
        const text = extractParseText(job.raw);
        if (text && text.trim()) {
          f.text = text;
          f.parser = "llamaparse";
        } else {
          f.parser = "unpdf"; // completed but empty — keep baseline
        }
        f.parse_status = "COMPLETED";
        audit(session, "parse_complete", { detail: `${f.filename} (${f.parser})` });
      } else if (job.status === "FAILED" || job.status === "CANCELLED") {
        f.parse_status = "FAILED";
        f.parser = "unpdf";
        audit(session, "parse_failed_fallback_unpdf", { detail: `${f.filename}: ${job.errorMessage ?? "job failed"}` });
      }
      // PENDING / RUNNING → leave for the next poll
    } catch (e) {
      f.parse_status = "FAILED";
      f.parser = "unpdf";
      audit(session, "parse_error_fallback_unpdf", { detail: `${f.filename}: ${(e as Error).message}` });
    }
  }

  const allTerminal = session.uploaded_files.every(
    (f) => f.parse_status === "COMPLETED" || f.parse_status === "FAILED"
  );
  if (allTerminal) {
    session.agent_outputs.reader.status = "pending";
    session.status = "reading";
    audit(session, "extraction_complete");
  }
}

// ─── Failure helpers ─────────────────────────────────────────────

function handleAgentFailure(session: Session, agent: AgentKey, code: string, detail: string) {
  failOrSoften(session, agent, code, detail);
}

// Transport/task-level failure (network blip, Lyzr 5xx, task expired). These
// are transient and distinct from agent-reported errors, so every agent gets
// one retry. Anomaly remains non-fatal; others fail only after the retry.
function handleTransportFailure(session: Session, agent: AgentKey, detail: string) {
  const out = session.agent_outputs[agent];
  if (out.attempts < 2) {
    out.status = "pending"; // keep current status; driving loop re-submits
    out.task_id = null;
    audit(session, "agent_retry", { agent, detail });
    return;
  }
  failOrSoften(session, agent, "TASK_FAILED", detail);
}

// ─── Derivations from agent JSON ─────────────────────────────────

function deriveCompanyName(session: Session): string | null {
  const j = session.agent_outputs.reader.json;
  // Only override with an actual customer/counterparty name — never the
  // contract_id (it's a reference, not a name; the filename-derived name is better).
  const v = pick(
    j,
    "customer_name",
    "counterparty",
    "customer",
    "client_name",
    "company_name"
  );
  if (typeof v === "string" && v.trim()) return v.trim();
  // Nested common shapes.
  const parties = pick(j, "parties");
  if (parties && typeof parties === "object") {
    const cust = pick(parties as Record<string, unknown>, "customer", "counterparty", "client");
    if (typeof cust === "string" && cust.trim()) return cust.trim();
  }
  return null;
}

export function extractInvoiceGates(session: Session): PerBillGate[] {
  const j = session.agent_outputs.billing.json;
  const invoices = (pick(j, "invoices", "bills") as unknown[]) ?? [];
  if (!Array.isArray(invoices)) return [];
  return invoices.map((inv, i) => {
    const rec = (inv ?? {}) as Record<string, unknown>;
    const number =
      (pick(rec, "invoice_number", "number", "id", "invoice_id") as string) ?? `INV-${i + 1}`;
    return {
      invoice_number: String(number),
      status: "pending" as const,
      approved_at: null,
      sent: false,
    };
  });
}

// Reconciliation precondition for Agent 4 (Billing).
export function reconciliationOk(session: Session): boolean {
  const j = session.agent_outputs.pricing.json;
  const rec = pick(j, "reconciliation") as Record<string, unknown> | undefined;
  if (!rec) return true; // absent → don't block (agent will self-check)
  const alloc = rec.allocation_matches;
  const monthly = rec.monthly_matches;
  // Only block when explicitly false.
  return alloc !== false && monthly !== false;
}

export function anomalyRecommendation(session: Session): string | null {
  const j = session.agent_outputs.anomaly.json;
  const summary = pick(j, "summary") as Record<string, unknown> | undefined;
  const rec = pick(summary, "recommendation") ?? pick(j, "recommendation");
  return typeof rec === "string" ? rec : null;
}
