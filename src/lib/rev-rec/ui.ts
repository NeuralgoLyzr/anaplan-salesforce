// Client-safe presentation helpers and shared view types (no server imports).
import type { SessionSource, SessionStatus } from "./types";

// Summary row for the Customers table (returned by GET /api/companies).
export interface SessionSummary {
  session_id: string;
  company_name: string;
  status: SessionStatus;
  started_at: string;
  updated_at: string;
  file_count: number;
  total_revenue: string | number | null;
  projection_months: number | null;
  anomaly_count: number | null;
  invoice_count: number | null;
  audit_count: number;
  source?: SessionSource;
}

export interface StatusMeta {
  label: string;
  // tailwind classes for a pill
  pill: string;
  // is the pipeline actively working (show spinner / keep polling)?
  busy: boolean;
}

// ADS Badge spec: bg-white, explicit hex border+text, 2px radius, uppercase
// blueberry token: 12px/500/uppercase — applied at call site
export const STATUS_META: Record<SessionStatus, StatusMeta> = {
  extracting: { label: "Extracting",        pill: "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]", busy: true  },
  reading:    { label: "Reading contracts",  pill: "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]", busy: true  },
  pricing:    { label: "Pricing",            pill: "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]", busy: true  },
  anomaly:    { label: "Anomaly review",     pill: "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]", busy: true  },
  gate1:      { label: "Needs approval",     pill: "bg-white text-[#ffbb16] border-[#ffbb16]",       busy: false },
  billing:    { label: "Generating bills",   pill: "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]", busy: true  },
  gate2:      { label: "Action needed",      pill: "bg-white text-[#ffbb16] border-[#ffbb16]",       busy: false },
  complete:   { label: "Complete",           pill: "bg-white text-[#14a687] border-[#14a687]",       busy: false },
  rejected:   { label: "Rejected",           pill: "bg-white text-[#db3743] border-[#db3743]",       busy: false },
  failed:     { label: "Failed",             pill: "bg-white text-[#db3743] border-[#db3743]",       busy: false },
};

export function isBusy(status: SessionStatus): boolean {
  return STATUS_META[status]?.busy ?? false;
}

// Format a possibly-numeric / possibly-string monetary value for display.
export function formatMoney(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number") {
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
