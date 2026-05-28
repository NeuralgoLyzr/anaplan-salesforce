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

export const STATUS_META: Record<SessionStatus, StatusMeta> = {
  extracting: { label: "Extracting", pill: "bg-sky-500/10 text-sky-600 border-sky-400/20", busy: true },
  reading:    { label: "Reading contracts", pill: "bg-sky-500/10 text-sky-600 border-sky-400/20", busy: true },
  pricing:    { label: "Pricing", pill: "bg-sky-500/10 text-sky-600 border-sky-400/20", busy: true },
  anomaly:    { label: "Anomaly review", pill: "bg-sky-500/10 text-sky-600 border-sky-400/20", busy: true },
  gate1:      { label: "Needs approval", pill: "bg-amber-500/10 text-amber-600 border-amber-400/20", busy: false },
  billing:    { label: "Generating bills", pill: "bg-sky-500/10 text-sky-600 border-sky-400/20", busy: true },
  gate2:      { label: "Action needed", pill: "bg-amber-500/10 text-amber-600 border-amber-400/20", busy: false },
  complete:   { label: "Complete", pill: "bg-emerald-500/10 text-emerald-600 border-emerald-400/20", busy: false },
  rejected:   { label: "Rejected", pill: "bg-red-500/10 text-red-600 border-red-400/20", busy: false },
  failed:     { label: "Failed", pill: "bg-red-500/10 text-red-600 border-red-400/20", busy: false },
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
