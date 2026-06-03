"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Table2, Receipt, BookOpen, ListChecks,
  Loader2, AlertTriangle, RefreshCw, ShieldAlert, Eye,
} from "lucide-react";
import { MarkdownPanel } from "@/components/pipeline/MarkdownPanel";
import { Stepper } from "@/components/rev-rec/Stepper";
import { Gate1RevenuePlan } from "@/components/rev-rec/Gate1RevenuePlan";
import { RecommendedActions } from "@/components/rev-rec/RecommendedActions";
import { BillsPanel } from "@/components/rev-rec/BillsPanel";
import { JournalEntriesPanel } from "@/components/rev-rec/JournalEntriesPanel";
import { DocumentPreviewModal } from "@/components/rev-rec/DocumentPreviewModal";
import { IntegratedSystemsCard } from "@/components/integrations/IntegratedSystemsCard";
import type { Session, SessionStatus, UploadedFile } from "@/lib/rev-rec/types";
import { RUNNING_LABEL } from "@/lib/rev-rec/types";
import { STATUS_META, isBusy, formatDate } from "@/lib/rev-rec/ui";
import { cn } from "@/lib/utils";

type TabId = "overview" | "plan" | "anomaly" | "bills" | "jes" | "audit";

function suggestedTab(status: SessionStatus): TabId {
  if (status === "gate1" || status === "rejected" || status === "billing") return "plan";
  if (status === "gate2" || status === "complete") return "bills";
  return "overview";
}

export default function CustomerWorkspace() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");

  const pollingRef = useRef(false);
  const lastSuggested = useRef<TabId | null>(null);

  const applySession = useCallback((s: Session) => {
    setSession(s);
    const sug = suggestedTab(s.status);
    if (lastSuggested.current !== sug) {
      lastSuggested.current = sug;
      setTab(sug);
    }
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      applySession(data.session);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, applySession]);

  const poll = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const res = await fetch(`/api/companies/${id}/poll`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.session) applySession(data.session);
    } catch {
      /* transient — next tick retries */
    } finally {
      pollingRef.current = false;
    }
  }, [id, applySession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Drive the pipeline while it's working.
  useEffect(() => {
    if (!session || !isBusy(session.status)) return;
    poll(); // immediate tick
    const t = setInterval(poll, 1000); // poll job status every 1s
    return () => clearInterval(t);
  }, [session, poll]);

  async function gate1(section: "allocation" | "monthly", decision: "approve" | "reject", approverName: string) {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/companies/${id}/gate1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, decision, approver_name: approverName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed");
      applySession(data.session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  }

  // Send an invoice via SES (PDF auto-attached server-side) and mark it paid.
  // This replaces the direct gate2 "approve" path when the user uses the
  // Approve & Send → email composer flow.
  async function sendInvoiceEmail(
    invoiceId: string,
    payload: { to: string; subject: string; body: string },
  ) {
    const res = await fetch(
      `/api/companies/${id}/invoices/${encodeURIComponent(invoiceId)}/send-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Send failed");
    applySession(data.session);
  }

  async function action(actionId: string, decision: "accept" | "reject" | "complete") {
    try {
      const res = await fetch(`/api/companies/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      applySession(data.session);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function uploadDocument(
    actionId: string,
    file: File,
    params: { operation: "add" | "update"; sourceDocId: string | null; triggersRerun: boolean },
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("action_id", actionId);
    form.append("operation", params.operation);
    if (params.sourceDocId) form.append("source_doc_id", params.sourceDocId);
    form.append("triggers_rerun", String(params.triggersRerun));
    const res = await fetch(`/api/companies/${id}/document-upload`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Document upload failed");
    applySession(data.session);
    return data.upload_summary as {
      filename: string;
      doc_id: string;
      operation: "add" | "update";
      pushed_to_salesforce: boolean;
      triggers_rerun: boolean;
      total_files: number;
    } | undefined;
  }

  async function sendEmail(
    actionId: string,
    payload: { to: string; subject: string; body: string },
  ) {
    const res = await fetch(`/api/companies/${id}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_id: actionId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Email send failed");
    applySession(data.session);
  }

  async function gate4() {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/companies/${id}/gate4`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      applySession(data.session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-6 py-10">
        <p className="text-sm text-destructive">{error ?? "Customer not found."}</p>
        <button onClick={() => router.push("/customers")} className="text-sm text-primary mt-2">← Back to customers</button>
      </div>
    );
  }

  const meta = STATUS_META[session.status];
  const busy = isBusy(session.status);
  const hasPlan = !!(session.agent_outputs.reader.json && session.agent_outputs.pricing.json);

  const anomalyRan = session.agent_outputs.anomaly.status !== "pending";
  const tabs: { id: TabId; label: string; icon: typeof FileText; show: boolean }[] = [
    { id: "overview", label: "Overview", icon: FileText, show: true },
    { id: "plan", label: "Revenue Plan", icon: Table2, show: hasPlan || session.status === "gate1" },
    { id: "anomaly", label: "Anomaly", icon: ShieldAlert, show: anomalyRan || hasPlan },
    { id: "bills", label: "Bills", icon: Receipt, show: session.agent_outputs.billing.status === "complete" },
    { id: "jes", label: "Journal Entries", icon: BookOpen, show: session.agent_outputs.billing.status === "complete" },
    { id: "audit", label: "Audit", icon: ListChecks, show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <div className="space-y-4 px-4 sm:px-6 py-5 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/customers")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{session.company_name}</h1>
              <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border", meta.pill)}>
                {meta.busy && <Loader2 className="w-3 h-3 animate-spin" />}
                {meta.label}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {session.uploaded_files.length} file{session.uploaded_files.length === 1 ? "" : "s"} · started {formatDate(session.started_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={fetchSession}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <IntegratedSystemsCard
            items={[
              { id: "salesforce", name: "Salesforce", logoSrc: "/Salesforce.com_logo.svg.png", connected: true },
              { id: "anaplan-mcp", name: "Anaplan MCP", logoSrc: "/PLAN-82aa46a2.png", connected: true },
            ]}
          />
        </div>
      </div>

      {/* Stepper */}
      <div className="glass-card rounded-xl px-4 py-3">
        <Stepper session={session} />
      </div>

      {/* Running banner */}
      {busy && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-[13px] text-primary">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {RUNNING_LABEL[session.status]}
        </div>
      )}

      {/* Failure banner */}
      {session.status === "failed" && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-[13px] text-destructive">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Pipeline failed
          </div>
          {session.errors.map((e, i) => (
            <p key={i} className="mt-1 text-[12px]">
              <span className="font-mono font-semibold">{e.code}</span>{e.agent ? ` (${e.agent})` : ""}: {e.detail}
            </p>
          ))}
        </div>
      )}

      {error && <div className="text-sm text-destructive px-1">{error}</div>}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit flex-wrap">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", active ? "text-primary" : "text-muted-foreground/70")} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {tab === "overview" && <OverviewTab session={session} />}

      {tab === "plan" && (
        hasPlan ? (
          <Gate1RevenuePlan
            session={session}
            actionable={session.status === "gate1"}
            onDecision={gate1}
          />
        ) : (
          <Placeholder icon={Table2} text="The revenue plan will appear once Pricing completes." />
        )
      )}

      {tab === "anomaly" && (
        <RecommendedActions
          session={session}
          handlers={{ decide: action, uploadDocument, sendEmail }}
        />
      )}

      {tab === "bills" && <BillsPanel session={session} onSendInvoice={sendInvoiceEmail} />}

      {tab === "jes" && <JournalEntriesPanel session={session} busy={actionBusy} onPost={gate4} />}

      {tab === "audit" && <AuditTab session={session} />}
    </div>
  );
}

function OverviewTab({ session }: { session: Session }) {
  const reader = session.agent_outputs.reader;
  const pricing = session.agent_outputs.pricing;
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  return (
    <div className="space-y-4">
      {/* Files */}
      <div className="glass-card rounded-xl p-4">
        <p className="text-sm font-semibold text-foreground mb-2">Uploaded documents</p>
        <ul className="space-y-1.5">
          {session.uploaded_files.map((f) => {
            const previewable = !!f.salesforce_content_version_id;
            return (
              <li
                key={f.doc_id}
                className={cn(
                  "flex items-center gap-2 text-sm rounded-md -mx-2 px-2 py-1 transition-colors",
                  previewable && "cursor-pointer hover:bg-primary/[0.04] group/file"
                )}
                onClick={() => previewable && setPreviewFile(f)}
                title={previewable ? "Click to preview PDF" : undefined}
              >
                <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                <span className={cn("truncate flex-1", previewable && "group-hover/file:text-primary")}>
                  {f.filename}
                </span>
                {previewable && (
                  <Eye className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/file:text-primary transition-colors shrink-0" />
                )}
                {f.parse_status === "RUNNING" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary"><Loader2 className="w-3 h-3 animate-spin" />parsing</span>
                )}
                {f.parser && f.parse_status !== "RUNNING" && (
                  <span className="text-[10px] text-muted-foreground/70">{f.parser}</span>
                )}
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{f.doc_type}</span>
                <span className="text-[11px] text-muted-foreground">{f.page_count}p · {f.language}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <DocumentPreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        sessionId={session.session_id}
        docId={previewFile?.doc_id ?? ""}
        filename={previewFile?.filename ?? ""}
      />

      <MarkdownPanel
        icon={FileText}
        title="Contract brief"
        subtitle="Agent 1 · Contract Reader"
        content={reader.markdown ?? ""}
        emptyTitle={reader.status === "running" ? "Reading contracts…" : "Not available yet"}
        emptyDescription="The contract brief will appear once Agent 1 completes."
        isLoading={reader.status === "running"}
      />

      <MarkdownPanel
        icon={Table2}
        title="Pricing brief"
        subtitle="Agent 2 · Pricing"
        content={pricing.markdown ?? ""}
        emptyTitle={pricing.status === "running" ? "Calculating revenue allocation…" : "Not available yet"}
        emptyDescription="The pricing brief will appear once Agent 2 completes."
        isLoading={pricing.status === "running"}
      />
    </div>
  );
}

function AuditTab({ session }: { session: Session }) {
  const agents = (["reader", "pricing", "anomaly", "billing"] as const).map((k) => ({
    key: k,
    out: session.agent_outputs[k],
  }));
  return (
    <div className="space-y-4">
      {/* Per-agent timing */}
      <div className="glass-card rounded-xl p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Agents</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {agents.map(({ key, out }) => (
            <div key={key} className="rounded-lg border border-primary/[0.07] p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</p>
              <p className={cn(
                "text-sm font-medium mt-0.5",
                out.status === "complete" && "text-success",
                out.status === "failed" && "text-destructive",
                out.status === "running" && "text-primary",
                out.status === "pending" && "text-muted-foreground"
              )}>
                {out.status}
              </p>
              {out.duration_ms != null && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{(out.duration_ms / 1000).toFixed(1)}s</p>
              )}
              {out.error_code && <p className="text-[10px] text-destructive mt-0.5 font-mono">{out.error_code}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Audit log */}
      <div className="glass-card rounded-xl p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Audit log</p>
        <ul className="space-y-1.5">
          {session.audit_log.slice().reverse().map((a, i) => (
            <li key={i} className="flex items-start gap-3 text-[12px]">
              <span className="text-muted-foreground/70 font-mono whitespace-nowrap shrink-0">{formatDate(a.ts)}</span>
              <span className="font-medium text-foreground/80">{a.event.replace(/_/g, " ")}</span>
              {a.agent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{a.agent}</span>}
              {a.detail && <span className="text-muted-foreground truncate">{a.detail}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Placeholder({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return (
    <div className="glass-card rounded-xl p-10 text-center">
      <Icon className="w-6 h-6 text-primary/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
