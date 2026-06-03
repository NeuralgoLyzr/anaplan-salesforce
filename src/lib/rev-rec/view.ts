// Client-safe view-model extractors. The agent JSON shapes are not strictly
// fixed, so every getter probes common field names and degrades gracefully.
import type { Session, ActionStatus } from "./types";

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function pickField(obj: unknown, ...keys: string[]): unknown {
  if (!isRec(obj)) return undefined;
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

// Find the first array under any of the given keys.
export function pickArray(obj: unknown, ...keys: string[]): Rec[] {
  const v = pickField(obj, ...keys);
  if (Array.isArray(v)) return v.filter(isRec) as Rec[];
  return [];
}

export function humanizeKey(k: string): string {
  return k
    .replace(/[_\-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/, "ID");
}

export function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length === 0 ? "—" : `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 57) + "…" : s;
  }
  return String(v);
}

// ─── Header summary (Gate 1) ─────────────────────────────────────

export interface HeaderSummary {
  company: string;
  contractRef: string | null;
  totalValue: string | null;
  period: string | null;
  currency: string | null;
}

export function getHeaderSummary(session: Session): HeaderSummary {
  const r = session.agent_outputs.reader.json;
  const p = session.agent_outputs.pricing.json;

  const contractRef = pickField(r, "contract_id", "contract_reference", "agreement_number", "reference", "contract_number");
  const totalValue =
    pickField(r, "contract_total_value", "total_contract_value", "tcv", "contract_value", "total_value") ??
    pickField(p, "contract_total_value", "total_contract_value", "tcv", "contract_value");
  const currency = pickField(r, "currency", "ccy") ?? pickField(p, "currency");

  let period = pickField(r, "term", "period", "contract_period", "subscription_term") as string | undefined;
  if (!period) {
    const start = pickField(r, "contract_effective_date", "start_date", "effective_date", "commencement_date");
    const end = pickField(r, "contract_end_date", "end_date", "expiry_date", "termination_date");
    if (start || end) period = `${start ?? "—"} → ${end ?? "—"}`;
  }

  return {
    company: session.company_name,
    contractRef: contractRef != null ? String(contractRef) : null,
    totalValue: totalValue != null ? formatCell(totalValue) : null,
    period: period ?? null,
    currency: currency != null ? String(currency) : null,
  };
}

// ─── Generic tabular data (allocation, monthly projection) ───────

export interface TableView {
  columns: string[];
  rows: Rec[];
}

// Normalizes a value that may be an array of row objects, or an object of
// key→value (rendered as a 2-column table), into columns + rows.
export function toTableView(value: unknown): TableView {
  if (Array.isArray(value)) {
    const rows = value.filter(isRec) as Rec[];
    const cols = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => cols.add(k)));
    return { columns: [...cols], rows };
  }
  if (isRec(value)) {
    const rows = Object.entries(value).map(([k, v]) => ({ field: humanizeKey(k), value: v }));
    return { columns: ["field", "value"], rows };
  }
  return { columns: [], rows: [] };
}

export function getAllocation(session: Session): TableView {
  const p = session.agent_outputs.pricing.json;
  const v = pickField(p, "allocation", "ssp_allocation", "allocations");
  return toTableView(v);
}

export function getMonthlyProjection(session: Session): TableView {
  const p = session.agent_outputs.pricing.json;
  const raw = pickField(p, "monthly_projection", "monthly_schedule", "projection", "schedule");
  if (!Array.isArray(raw)) return toTableView(raw);

  // Map line_item_id -> friendly product name from the allocation, so the
  // per-line-item breakdown renders as named columns instead of raw JSON.
  const labelMap = new Map<string, string>();
  const alloc = pickField(p, "allocation", "ssp_allocation", "allocations");
  if (Array.isArray(alloc)) {
    for (const a of alloc) {
      const o = a as Rec;
      if (typeof o?.line_item_id === "string" && typeof o?.product_name === "string") {
        labelMap.set(o.line_item_id, o.product_name);
      }
    }
  }
  const label = (id: string) => labelMap.get(id) ?? id.split(":").pop() ?? id;

  const rows = raw.filter(isRec) as Rec[];

  // Collect breakdown line-item keys in first-seen order for stable columns.
  const itemKeys: string[] = [];
  for (const r of rows) {
    const bd = r.breakdown;
    if (isRec(bd)) for (const k of Object.keys(bd)) if (!itemKeys.includes(k)) itemKeys.push(k);
  }

  const flat: Rec[] = rows.map((r) => {
    const out: Rec = {
      month: r.month ?? r.period,
      total_revenue: r.total_revenue ?? r.total,
    };
    const bd = r.breakdown;
    if (isRec(bd)) for (const k of itemKeys) out[label(k)] = bd[k];
    return out;
  });

  const columns = ["month", "total_revenue", ...itemKeys.map(label)];
  return { columns, rows: flat };
}

// Builds the per-month, per-product stack for a vertical stacked bar chart
// (X = month, Y = revenue, stack = product).
export interface RevenueStack {
  data: Record<string, number | string>[]; // [{ month, total, [product]: amount }]
  products: string[];
}

export function getRevenueByMonth(session: Session): RevenueStack {
  const p = session.agent_outputs.pricing.json;
  const raw = pickField(p, "monthly_projection", "monthly_schedule", "projection", "schedule");
  if (!Array.isArray(raw)) return { data: [], products: [] };

  const labelMap = new Map<string, string>();
  const alloc = pickField(p, "allocation", "ssp_allocation", "allocations");
  if (Array.isArray(alloc)) {
    for (const a of alloc) {
      const o = a as Rec;
      if (typeof o?.line_item_id === "string" && typeof o?.product_name === "string") {
        labelMap.set(o.line_item_id, o.product_name);
      }
    }
  }
  const label = (id: string) => labelMap.get(id) ?? id.split(":").pop() ?? id;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const products: string[] = [];
  const rows = raw.filter(isRec) as Rec[];

  const data: Record<string, number | string>[] = rows.map((r) => {
    const row: Record<string, number | string> = { month: String(r.month ?? r.period ?? "") };
    const bd = r.breakdown;
    if (isRec(bd) && Object.keys(bd).length > 0) {
      for (const [k, v] of Object.entries(bd)) {
        const name = label(k);
        if (!products.includes(name)) products.push(name);
        row[name] = round2(typeof v === "number" ? v : Number(v) || 0);
      }
    } else {
      if (!products.includes("Revenue")) products.push("Revenue");
      row["Revenue"] = round2(Number(r.total_revenue ?? r.total ?? 0) || 0);
    }
    return row;
  });

  // Ensure every row carries every product key (0 default) for clean stacking,
  // and compute the per-month total.
  for (const row of data) {
    let total = 0;
    for (const prod of products) {
      const v = typeof row[prod] === "number" ? (row[prod] as number) : 0;
      row[prod] = v;
      total += v;
    }
    row.total = round2(total);
  }

  return { data, products };
}

export interface Reconciliation {
  allocationMatches: boolean | null;
  monthlyMatches: boolean | null;
  raw: Rec | null;
}

export function getReconciliation(session: Session): Reconciliation {
  const p = session.agent_outputs.pricing.json;
  const rec = pickField(p, "reconciliation") as Rec | undefined;
  if (!isRec(rec)) return { allocationMatches: null, monthlyMatches: null, raw: null };
  const am = rec.allocation_matches;
  const mm = rec.monthly_matches;
  return {
    allocationMatches: typeof am === "boolean" ? am : null,
    monthlyMatches: typeof mm === "boolean" ? mm : null,
    raw: rec,
  };
}

// ─── Anomalies (Agent 3) ─────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Anomaly {
  severity: Severity;
  category: string | null;
  title: string;
  detail: string;          // "what" / findings.whats_happening
  why: string | null;      // findings.why_it_matters
  whatToCheck: string | null; // findings.what_to_check
  recommendation: string | null;
  citations: string[];     // "evidence" — citation refs
  raw: Rec;
}

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

// Coerce a possibly-object field to readable text (never "[object Object]").
function asText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Rec;
    const t = o.text ?? o.value ?? o.ref ?? o.description;
    return t != null ? String(t) : null;
  }
  return String(v);
}

// Evidence may be a string, an object { ref/citation/quote }, or an array of those.
function extractCitations(evidence: unknown): string[] {
  if (evidence == null) return [];
  const arr = Array.isArray(evidence) ? evidence : [evidence];
  return arr
    .map((e) => {
      if (typeof e === "string") return e;
      if (e && typeof e === "object") {
        const o = e as Rec;
        const ref = o.ref ?? o.citation ?? o.reference ?? o.quote ?? o.location ?? o.source ?? o.page ?? o.text;
        return ref != null ? String(ref) : null;
      }
      return null;
    })
    .filter((x): x is string => !!x && x.trim().length > 0);
}

export function getAnomalies(session: Session): Anomaly[] {
  const a = session.agent_outputs.anomaly.json;
  const arr = pickArray(a, "anomalies", "issues");
  return arr.map((row) => {
    const sevRaw = String(pickField(row, "severity", "level", "priority") ?? "info").toLowerCase();
    const severity = (SEVERITY_ORDER.includes(sevRaw as Severity) ? sevRaw : "info") as Severity;
    const evidence = pickField(row, "evidence", "citation", "citations", "reference", "location", "source", "page");
    // New format nests the narrative under `findings`; older format had it flat.
    const f = (isRec(row.findings) ? (row.findings as Rec) : {}) as Rec;
    return {
      severity,
      category: asText(pickField(row, "category", "type")),
      title: asText(pickField(row, "title", "name", "headline", "issue")) ?? "Anomaly",
      detail: asText(f.whats_happening ?? pickField(row, "what", "detail", "description", "summary", "message", "explanation")) ?? "",
      why: asText(f.why_it_matters ?? pickField(row, "why_it_matters", "why", "impact", "rationale")),
      whatToCheck: asText(f.what_to_check ?? pickField(row, "what_to_check")),
      recommendation: asText(pickField(row, "recommendation", "suggested_action", "action")),
      citations: extractCitations(evidence),
      raw: row,
    };
  });
}

export function getAnomalyRecommendation(session: Session): string | null {
  const a = session.agent_outputs.anomaly.json;
  const summary = pickField(a, "summary");
  const rec = pickField(summary, "recommendation") ?? pickField(a, "recommendation");
  return rec != null ? String(rec) : null;
}

export function groupBySeverity(anomalies: Anomaly[]): { severity: Severity; items: Anomaly[] }[] {
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    items: anomalies.filter((x) => x.severity === severity),
  })).filter((g) => g.items.length > 0);
}

export const SEVERITY_STYLE: Record<Severity, { pill: string; dot: string; label: string }> = {
  critical: { pill: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive", label: "Critical" },
  high:     { pill: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning", label: "High" },
  medium:   { pill: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning", label: "Medium" },
  low:      { pill: "bg-slate-400/10 text-slate-500 border-slate-300/30", dot: "bg-slate-400", label: "Low" },
  info:     { pill: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary", label: "Info" },
};

// ─── Action items (Agent 3) ──────────────────────────────────────
// The Anomaly agent emits action_items per anomaly. These are grouped into
// friendly categories (derived from ui_trigger) for the "Recommended actions"
// panel, carrying their parent anomaly's context and the user's decision.

export type ActionKind = "upload_document" | "send_email" | "acknowledge" | "other";

export interface UploadDocumentParams {
  document_name: string | null;
  document_reference: string | null;
  source_doc_id: string | null;
  operation: "add" | "update";
  triggers_rerun: boolean;
}

export interface SendEmailParams {
  recipient_role: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  subject: string;
  body: string;
}

export interface ActionItemView {
  actionId: string;
  title: string;
  context: string;
  uiTrigger: string;
  kind: ActionKind;        // normalized from action.type / ui_trigger
  priority: string;        // before_approval | post_approval | informational
  blocking: boolean;
  targetRole: string | null;
  targetName: string | null;
  anomalyTitle: string;
  severity: Severity;
  whatToCheck: string | null;
  citations: string[];
  status: ActionStatus;
  // Kind-specific params, only populated for the matching kind.
  uploadParams: UploadDocumentParams | null;
  emailParams: SendEmailParams | null;
}

export interface ActionCategory {
  key: string;
  label: string;
  iconKey: string;
  items: ActionItemView[];
}

export interface ActionItemsView {
  categories: ActionCategory[];
  total: number;
  blocking: number;
}

const TRIGGER_CATEGORY: Record<string, { key: string; label: string; iconKey: string }> = {
  draft_email: { key: "comms", label: "Emails & Escalations", iconKey: "mail" },
  send_email: { key: "comms", label: "Emails & Escalations", iconKey: "mail" },
  request_clarification: { key: "comms", label: "Emails & Escalations", iconKey: "mail" },
  escalate: { key: "comms", label: "Emails & Escalations", iconKey: "mail" },
  add_to_calendar: { key: "deadlines", label: "Deadlines & Reminders", iconKey: "calendar" },
  request_document: { key: "docs", label: "Documents", iconKey: "file" },
  upload_document: { key: "docs", label: "Documents", iconKey: "file" },
  attach_supporting_doc: { key: "docs", label: "Documents", iconKey: "file" },
  flag_for_review: { key: "reviews", label: "Reviews & Approvals", iconKey: "review" },
  update_record: { key: "records", label: "Records & Bookkeeping", iconKey: "record" },
  acknowledge: { key: "other", label: "Acknowledgements", iconKey: "review" },
};
const OTHER_CATEGORY = { key: "other", label: "Other actions", iconKey: "dot" };

function deriveKind(trigger: string): ActionKind {
  switch (trigger) {
    case "upload_document":
    case "request_document":
    case "attach_supporting_doc":
      return "upload_document";
    case "send_email":
    case "draft_email":
    case "request_clarification":
    case "escalate":
      return "send_email";
    case "acknowledge":
      return "acknowledge";
    default:
      return "other";
  }
}

function extractUploadParams(it: Rec): UploadDocumentParams | null {
  const p = pickField(it, "params") as Rec | undefined;
  if (!p && !pickField(it, "source_doc_id", "operation")) return null;
  const src = p ?? it;
  const op = String(pickField(src, "operation") ?? "add").toLowerCase();
  return {
    document_name: asText(pickField(src, "document_name", "name", "title")),
    document_reference: asText(pickField(src, "document_reference", "reference")),
    source_doc_id: asText(pickField(src, "source_doc_id", "doc_id")),
    operation: op === "update" ? "update" : "add",
    triggers_rerun: pickField(src, "triggers_rerun", "rerun") === true,
  };
}

function extractEmailParams(it: Rec): SendEmailParams | null {
  const p = pickField(it, "params") as Rec | undefined;
  if (!p && !pickField(it, "subject", "body")) return null;
  const src = p ?? it;
  const subject = asText(pickField(src, "subject")) ?? "";
  const body = asText(pickField(src, "body", "message")) ?? "";
  if (!subject && !body) return null;
  return {
    recipient_role: asText(pickField(src, "recipient_role", "target_role", "role")),
    recipient_name: asText(pickField(src, "recipient_name", "target_name", "name")),
    recipient_email: asText(pickField(src, "recipient_email", "target_email", "email")),
    subject,
    body,
  };
}

export function getActionItems(session: Session): ActionItemsView {
  const a = session.agent_outputs.anomaly.json;
  const anomalies = pickArray(a, "anomalies", "issues");
  const states = session.action_items ?? {};

  const order: string[] = [];
  const map = new Map<string, ActionCategory>();
  let total = 0;
  let blocking = 0;

  anomalies.forEach((an, ai) => {
    const sevRaw = String(pickField(an, "severity", "level", "priority") ?? "info").toLowerCase();
    const severity = (SEVERITY_ORDER.includes(sevRaw as Severity) ? sevRaw : "info") as Severity;
    const anomalyTitle = asText(pickField(an, "title", "name")) ?? "Anomaly";
    const f = (isRec(an.findings) ? (an.findings as Rec) : {}) as Rec;
    const whatToCheck = asText(f.what_to_check ?? pickField(an, "what_to_check"));
    const citations = extractCitations(pickField(an, "evidence", "citation", "citations"));

    pickArray(an, "action_items", "actions").forEach((it, ii) => {
      const actionId = String(pickField(it, "action_id", "id") ?? `${ai}:${ii}`);
      const trigger = String(pickField(it, "ui_trigger", "type", "action_type") ?? "other");
      const cat = TRIGGER_CATEGORY[trigger] ?? OTHER_CATEGORY;
      const kind = deriveKind(trigger);
      const params = pickField(it, "params") as Rec | undefined;
      const view: ActionItemView = {
        actionId,
        title: asText(pickField(it, "title", "name")) ?? "Action",
        context: asText(pickField(it, "context", "description", "detail", "details")) ?? "",
        uiTrigger: trigger,
        kind,
        priority: String(pickField(it, "priority") ?? ""),
        blocking: pickField(it, "blocks_gate_1", "blocking") === true,
        targetRole:
          asText(pickField(it, "target_role", "role")) ??
          asText(pickField(params, "recipient_role", "target_role", "role")),
        targetName:
          asText(pickField(it, "target_name")) ??
          asText(pickField(params, "recipient_name", "target_name")),
        anomalyTitle,
        severity,
        whatToCheck,
        citations,
        status: states[actionId]?.status ?? "pending",
        uploadParams: kind === "upload_document" ? extractUploadParams(it) : null,
        emailParams: kind === "send_email" ? extractEmailParams(it) : null,
      };
      total++;
      if (view.blocking) blocking++;
      if (!map.has(cat.key)) {
        order.push(cat.key);
        map.set(cat.key, { key: cat.key, label: cat.label, iconKey: cat.iconKey, items: [] });
      }
      map.get(cat.key)!.items.push(view);
    });
  });

  return { categories: order.map((k) => map.get(k)!), total, blocking };
}

export function prettyTrigger(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Invoices (Agent 4) ──────────────────────────────────────────

// Invoice lifecycle: only one invoice is "unlocked" at any time. The user
// sends it; on send it transitions to "paid" and the next sequence unlocks.
export type InvoiceStatus = "actionable" | "scheduled" | "paid" | "archived" | "rejected";
export type InvoiceLockState = "unlocked" | "locked";

export interface InvoiceLine {
  lineItemId: string | null;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
  periodLabel: string | null;
}

export interface InvoiceParty {
  name: string;
  address: string | null;
  billingContact: string | null;
  taxId: string | null;
  poReference?: string | null;
}

export interface InvoiceReferences {
  poNumber: string | null;
  contractReference: string | null;
  ssaReference: string | null;
}

export interface InvoiceView {
  id: string;                      // invoice_id (legacy: invoice_number)
  sequence: number | null;
  status: InvoiceStatus;
  lockState: InvoiceLockState;
  issueDate: string | null;
  dueDate: string | null;
  paymentTerms: string | null;
  periodLabel: string | null;
  vendor: InvoiceParty | null;     // resolved (per-invoice or top-level fallback)
  customer: InvoiceParty | null;
  lineItems: InvoiceLine[];
  subtotal: number | null;
  taxTotal: number | null;
  total: string | null;            // formatted for display
  totalNumber: number | null;      // raw numeric
  references: InvoiceReferences | null;
  currency: string | null;
  notes: string | null;
  markdown: string | null;         // legacy fallback when no structured fields
  raw: Rec;
}

export interface BillingHeader {
  contractId: string | null;
  currency: string | null;
  cadence: string | null;
  vendor: InvoiceParty | null;
  customer: InvoiceParty | null;
}

function extractParty(raw: unknown, defaults: { poRef?: string | null } = {}): InvoiceParty | null {
  if (!isRec(raw)) return null;
  const o = raw as Rec;
  const name = asText(o.name);
  if (!name) return null;
  return {
    name,
    address: asText(o.address),
    billingContact: asText(o.billing_contact ?? o.billingContact ?? o.contact),
    taxId: asText(o.tax_id ?? o.taxId),
    poReference: asText(o.po_reference ?? o.poReference ?? defaults.poRef ?? null),
  };
}

export function getBillingHeader(session: Session): BillingHeader {
  const b = session.agent_outputs.billing.json;
  return {
    contractId: asText(pickField(b, "contract_id", "contractId")),
    currency: asText(pickField(b, "currency", "ccy")),
    cadence: asText(pickField(b, "billing_cadence", "cadence")),
    vendor: extractParty(pickField(b, "vendor")),
    customer: extractParty(pickField(b, "customer")),
  };
}

function periodLabelOf(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Rec;
    const label = asText(o.label);
    if (label) return label;
    const start = o.start ?? o.from ?? o.period_start;
    const end = o.end ?? o.to ?? o.period_end;
    if (start || end) return `${start ?? "—"} → ${end ?? "—"}`;
  }
  return null;
}

function asNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ─── Invoice email template (Agent 4) ────────────────────────────
// The Billing agent emits a SINGLE reusable email subject + body alongside the
// invoice schedule. The same template is reused for every invoice in the run —
// only the six allowed placeholders ({{invoice_id}}, {{period_label}},
// {{currency}}, {{grand_total}}, {{issue_date}}, {{due_date}}) vary.

export interface InvoiceEmailTemplate {
  subject: string;
  body: string;
}

export function getInvoiceEmailTemplate(session: Session): InvoiceEmailTemplate | null {
  const b = session.agent_outputs.billing.json;
  const tpl = pickField(b, "invoice_email_template");
  if (!isRec(tpl)) return null;
  const subject = asText(pickField(tpl, "subject"));
  const body = asText(pickField(tpl, "body"));
  if (!subject || !body) return null;
  return { subject, body };
}

// Substitute the six allowed placeholders against a specific invoice.
// Anything outside the whitelist is left untouched (so `[Your name]` survives
// for the user to fill in inside the composer).
export function fillInvoiceEmailTemplate(
  template: InvoiceEmailTemplate,
  inv: InvoiceView,
): InvoiceEmailTemplate {
  const subs: Record<string, string> = {
    invoice_id: inv.id,
    period_label: inv.periodLabel ?? "",
    currency: inv.currency ?? "",
    grand_total: inv.total ?? (inv.totalNumber != null ? formatCell(inv.totalNumber) : ""),
    issue_date: inv.issueDate ?? "",
    due_date: inv.dueDate ?? "",
  };
  const replace = (s: string) =>
    s.replace(/\{\{\s*(invoice_id|period_label|currency|grand_total|issue_date|due_date)\s*\}\}/g,
      (_m, k) => subs[k] ?? "");
  return {
    subject: replace(template.subject),
    body: replace(template.body),
  };
}

export function getInvoices(session: Session): InvoiceView[] {
  const b = session.agent_outputs.billing.json;
  const arr = pickArray(b, "invoices", "bills");
  const header = getBillingHeader(session);
  const legacyGates = session.gates?.g2_per_bill ?? [];
  const currency = header.currency;

  // First pass: extract base fields + collect identifiers for legacy-state derivation.
  const base = arr.map((row, i): { row: Rec; raw: InvoiceView } => {
    const id = String(pickField(row, "invoice_id", "invoice_number", "number", "id") ?? `INV-${i + 1}`);
    const sequence = asNum(pickField(row, "sequence", "cycle_number"));
    const periodCovered = pickField(row, "period_covered", "billingPeriod", "service_period", "period", "billing_period");
    const subtotal = asNum(pickField(row, "subtotal"));
    const taxTotal = asNum(pickField(row, "tax_total", "tax"));
    const totalNumber = asNum(pickField(row, "grand_total", "total", "total_amount", "invoice_total", "amount", "line_total"));

    const refsRaw = pickField(row, "references") as Rec | undefined;
    const references: InvoiceReferences | null = refsRaw
      ? {
          poNumber: asText(refsRaw.po_number ?? refsRaw.poNumber),
          contractReference: asText(refsRaw.contract_reference ?? refsRaw.contractReference),
          ssaReference: asText(refsRaw.ssa_reference ?? refsRaw.ssaReference),
        }
      : null;

    const lineItems: InvoiceLine[] = pickArray(row, "line_items", "lineItems", "items").map((l) => ({
      lineItemId: asText(pickField(l, "line_item_id", "lineItemId", "id")),
      description: asText(pickField(l, "description", "product_name", "name")) ?? "—",
      quantity: asNum(pickField(l, "quantity", "qty")),
      unitPrice: asNum(pickField(l, "unit_price", "unitPrice", "price")),
      total: asNum(pickField(l, "total", "line_total", "lineTotal", "amount")),
      periodLabel: periodLabelOf(pickField(l, "period_covered", "period")),
    }));

    const view: InvoiceView = {
      id,
      sequence,
      // statuses get filled in the second pass (legacy derivation needs all invoices)
      status: "scheduled",
      lockState: "locked",
      issueDate: asText(pickField(row, "issue_date", "invoice_date", "issued_on")),
      dueDate: asText(pickField(row, "due_date", "due", "payment_due", "due_on")),
      paymentTerms: asText(pickField(row, "payment_terms")) ?? (asNum(pickField(row, "payment_terms_days")) != null ? `Net ${asNum(pickField(row, "payment_terms_days"))}` : null),
      periodLabel: periodLabelOf(periodCovered),
      vendor: extractParty(pickField(row, "vendor")) ?? header.vendor,
      customer: extractParty(pickField(row, "customer"), { poRef: asText(pickField(refsRaw, "po_number") ?? pickField(row, "po_reference")) }) ?? header.customer,
      lineItems,
      subtotal,
      taxTotal,
      total: totalNumber != null ? formatCell(totalNumber) : null,
      totalNumber,
      references,
      currency,
      notes: asText(pickField(row, "notes")),
      markdown: asText(pickField(row, "markdown", "rendered", "invoice_markdown", "body", "content")),
      raw: row,
    };
    return { row, raw: view };
  });

  // Second pass: status + lock_state.
  // Prefer agent-provided values; otherwise derive from legacy g2_per_bill or
  // by sequence (first not-decided is "actionable/unlocked").
  function legacyOf(id: string) {
    return legacyGates.find((g) => g.invoice_number === id);
  }

  let firstUndecidedIdx = -1;
  base.forEach(({ row, raw }, i) => {
    const explicitStatus = asText(pickField(row, "status"));
    const explicitLock = asText(pickField(row, "lock_state", "lockState"));
    const sentAt = asText(pickField(row, "sent_at"));
    const legacy = legacyOf(raw.id);
    // Heal pass: if an invoice has sent_at set (or its legacy gate says
    // sent/approved) but the explicit status says "actionable"/"scheduled",
    // that's the corrupted-state signature from the old next-pick bug —
    // restore it to paid+locked at the view layer so the UI never offers
    // re-sending an already-sent invoice.
    const wasSent = !!sentAt || legacy?.sent === true || legacy?.status === "approved";
    if (wasSent) {
      raw.status = "paid";
      raw.lockState = "locked";
      return;
    }
    if (explicitStatus || explicitLock) {
      raw.status = (explicitStatus ?? "scheduled") as InvoiceStatus;
      raw.lockState = (explicitLock ?? (raw.status === "actionable" ? "unlocked" : "locked")) as InvoiceLockState;
      return;
    }
    if (legacy?.status === "rejected") {
      raw.status = "archived";
      raw.lockState = "locked";
    } else {
      if (firstUndecidedIdx === -1) firstUndecidedIdx = i;
      raw.status = "scheduled";
      raw.lockState = "locked";
    }
  });
  // The "first actionable" sweep only runs when no invoice carried an explicit
  // state. With the heal pass above, every paid invoice is already pinned —
  // we just need to find the lowest-sequence non-paid invoice in display order.
  if (firstUndecidedIdx !== -1) {
    base[firstUndecidedIdx].raw.status = "actionable";
    base[firstUndecidedIdx].raw.lockState = "unlocked";
  } else {
    // If the explicit branch ran for everything, make sure exactly one invoice
    // is "actionable+unlocked": the lowest-sequence one whose status is
    // "scheduled". Heals data where the next-pick reverted an earlier paid
    // invoice and left N actionable rows.
    const actionable = base
      .filter((b) => b.raw.status === "scheduled")
      .sort((a, b) => (a.raw.sequence ?? 0) - (b.raw.sequence ?? 0))[0];
    if (actionable) {
      // Only flip if no other invoice is already in actionable state.
      const anyActionable = base.some((b) => b.raw.status === "actionable");
      if (!anyActionable) {
        actionable.raw.status = "actionable";
        actionable.raw.lockState = "unlocked";
      }
    }
  }

  return base.map((b) => b.raw);
}

// ─── Journal entries (Agent 4 / Gate 4) ──────────────────────────

export interface JeLine {
  account: string;
  dr: number | null;
  cr: number | null;
}

export interface JournalEntry {
  date: string | null;
  memo: string;
  type: string;
  lines: JeLine[];
  raw: Rec;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function getJournalEntries(session: Session): JournalEntry[] {
  const b = session.agent_outputs.billing.json;
  const arr = pickArray(b, "journal_entries", "journalEntries", "jes", "entries");
  return arr.map((row) => {
    const lines = pickArray(row, "lines", "entries", "rows", "postings").map((l) => ({
      account: String(pickField(l, "account", "account_name", "gl_account", "ledger", "name") ?? "—"),
      dr: num(pickField(l, "dr", "debit", "debit_amount")),
      cr: num(pickField(l, "cr", "credit", "credit_amount")),
    }));
    return {
      date: (pickField(row, "event_date", "date", "je_date", "posting_date") as string | undefined) ?? null,
      memo: String(pickField(row, "memo", "description", "narrative", "note") ?? ""),
      type: String(pickField(row, "event_type", "type", "je_type", "category", "kind") ?? "Journal Entry"),
      lines,
      raw: row,
    };
  });
}

export function jeTotals(entries: JournalEntry[]): { dr: number; cr: number } {
  let dr = 0;
  let cr = 0;
  for (const e of entries) {
    for (const l of e.lines) {
      dr += l.dr ?? 0;
      cr += l.cr ?? 0;
    }
  }
  return { dr, cr };
}
