// Domain model for the Revenue Recognition pipeline.
// Mirrors the session object described in the Implementation Guide,
// adapted for MongoDB persistence.

export type DocType = "SSA" | "OS" | "unknown";

export type AgentKey = "reader" | "pricing" | "anomaly" | "billing";

export type AgentRunStatus = "pending" | "running" | "complete" | "failed";

// Overall pipeline state. Drives both UI rendering and the poll state machine.
export type SessionStatus =
  | "extracting"   // server extracting PDF text (transient, set during create)
  | "reading"      // Agent 1 running
  | "pricing"      // Agent 2 running
  | "anomaly"      // Agent 3 running
  | "gate1"        // blocked: awaiting revenue-plan approval
  | "billing"      // Agent 4 running
  | "gate2"        // blocked: awaiting per-bill + JE approvals
  | "complete"
  | "rejected"     // user rejected at Gate 1
  | "failed";      // an agent hard-failed

export type ParseStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type ParserUsed = "llamaparse" | "unpdf" | "pending";

export interface UploadedFile {
  filename: string;
  doc_id: string;
  doc_type: DocType;
  language: string;
  page_count: number;
  text: string; // extracted text with "--- Page N ---" markers

  // PDF parsing (LlamaParse primary, unpdf fallback).
  parser: ParserUsed;          // which parser produced `text`
  parse_status: ParseStatus;   // job lifecycle for LlamaParse
  llama_file_id: string | null;
  llama_job_id: string | null;
}

export interface AgentOutput {
  status: AgentRunStatus;
  markdown: string | null;
  json: Record<string, unknown> | null;
  raw: string | null;          // full raw agent response text
  task_id: string | null;      // Lyzr task id while running
  session_id: string | null;   // the random Lyzr session id used for the call
  attempts: number;            // submit attempts (for the single-retry rule)
  ran_at: string | null;       // ISO when submitted
  completed_at: string | null; // ISO when finished
  duration_ms: number | null;
  error_code: string | null;
  error_detail: string | null;
}

export function emptyAgentOutput(): AgentOutput {
  return {
    status: "pending",
    markdown: null,
    json: null,
    raw: null,
    task_id: null,
    session_id: null,
    attempts: 0,
    ran_at: null,
    completed_at: null,
    duration_ms: null,
    error_code: null,
    error_detail: null,
  };
}

export interface GateDecision {
  status: "pending" | "approved" | "rejected";
  approver_name: string | null;
  approved_at: string | null;
  notes: string | null;
}

export interface PerBillGate {
  invoice_number: string;
  status: "pending" | "approved" | "rejected";
  approved_at: string | null;
  sent: boolean;
}

export interface AuditEntry {
  ts: string;
  event: string;
  agent?: AgentKey;
  detail?: string;
  meta?: Record<string, unknown>;
}

// Per anomaly action-item decision (keyed by action_id).
export type ActionStatus = "pending" | "accepted" | "rejected";
export interface ActionItemState {
  status: ActionStatus;
  updated_at: string;
  by?: string | null;
}

export type SessionSource = "manual" | "salesforce";

export interface Session {
  session_id: string; // app session id (uuid) — distinct from per-call Lyzr session ids
  company_name: string;
  status: SessionStatus;
  started_at: string;
  updated_at: string;

  // How this Session entered the system. Manual upload via the dialog vs.
  // auto-ingested from Salesforce by the sync worker. Undefined on older
  // documents created before this field existed — treat as "manual".
  source?: SessionSource;
  salesforce_contract_id?: string;
  salesforce_account_id?: string;

  uploaded_files: UploadedFile[];

  agent_outputs: {
    reader: AgentOutput;
    pricing: AgentOutput;
    anomaly: AgentOutput;
    billing: AgentOutput;
  };

  gates: {
    g1_allocation: GateDecision;     // approval for the SSP allocation
    g1_monthly: GateDecision;        // approval for the monthly projection
    g1_revenue_plan: GateDecision;   // overall — approved once both sub-gates approve
    g2_per_bill: PerBillGate[];
    g4_je_post: GateDecision;
  };

  // Accept/reject decisions for anomaly action items, keyed by action_id.
  action_items: Record<string, ActionItemState>;

  errors: { agent?: AgentKey; code: string; detail: string; ts: string }[];
  audit_log: AuditEntry[];
}

export const AGENT_ORDER: AgentKey[] = ["reader", "pricing", "anomaly", "billing"];

// Human-facing labels for the "running" indicator per the Implementation Guide.
export const RUNNING_LABEL: Record<SessionStatus, string> = {
  extracting: "Extracting text from contracts…",
  reading: "Reading contracts…",
  pricing: "Calculating revenue allocation…",
  anomaly: "Reviewing for anomalies…",
  gate1: "Awaiting revenue plan approval",
  billing: "Generating bills and journal entries…",
  gate2: "Awaiting invoice & journal entry approval",
  complete: "Complete",
  rejected: "Rejected",
  failed: "Failed",
};

function emptyGate(): GateDecision {
  return { status: "pending", approver_name: null, approved_at: null, notes: null };
}

export function newSession(partial: {
  session_id: string;
  company_name: string;
  uploaded_files: UploadedFile[];
}): Session {
  const now = new Date().toISOString();
  return {
    session_id: partial.session_id,
    company_name: partial.company_name,
    status: "reading",
    started_at: now,
    updated_at: now,
    uploaded_files: partial.uploaded_files,
    agent_outputs: {
      reader: emptyAgentOutput(),
      pricing: emptyAgentOutput(),
      anomaly: emptyAgentOutput(),
      billing: emptyAgentOutput(),
    },
    gates: {
      g1_allocation: emptyGate(),
      g1_monthly: emptyGate(),
      g1_revenue_plan: emptyGate(),
      g2_per_bill: [],
      g4_je_post: emptyGate(),
    },
    action_items: {},
    errors: [],
    audit_log: [{ ts: now, event: "session_created" }],
  };
}
