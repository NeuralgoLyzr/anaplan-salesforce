"use client";

import { useState } from "react";
import {
  Sparkles, ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2,
  Mail, CalendarClock, FileText, ClipboardCheck, Database, Circle, Check,
} from "lucide-react";
import type { Session } from "@/lib/rev-rec/types";
import {
  getActionItems, prettyTrigger, SEVERITY_STYLE,
  type ActionItemView, type ActionCategory,
} from "@/lib/rev-rec/view";
import { cn } from "@/lib/utils";
import { DocumentUploadBox } from "./DocumentUploadBox";
import { EmailComposeModal } from "./EmailComposeModal";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail, calendar: CalendarClock, file: FileText, review: ClipboardCheck, record: Database, dot: Circle,
};

function priorityBadge(p: string): { label: string; cls: string } | null {
  if (p === "before_approval") return { label: "Before approval", cls: "bg-warning/10 text-warning border-warning/20" };
  if (p === "post_approval") return { label: "After approval", cls: "bg-muted/60 text-muted-foreground border-border/50" };
  if (p === "informational") return { label: "Informational", cls: "bg-primary/10 text-primary border-primary/20" };
  return null;
}

// Handler bundle: parent provides everything the actions need to talk to APIs.
export interface UploadSummary {
  filename: string;
  doc_id: string;
  operation: "add" | "update";
  pushed_to_salesforce: boolean;
  triggers_rerun: boolean;
  total_files: number;
}

export interface ActionHandlers {
  // Generic decisions for non-automation actions.
  decide: (actionId: string, decision: "accept" | "reject" | "complete") => Promise<void>;
  // Document upload (multipart). Returns a summary so the UI can confirm.
  uploadDocument: (actionId: string, file: File, params: {
    operation: "add" | "update";
    sourceDocId: string | null;
    triggersRerun: boolean;
  }) => Promise<UploadSummary | undefined>;
  // Email send.
  sendEmail: (actionId: string, payload: { to: string; subject: string; body: string }) => Promise<void>;
}

interface Props {
  session: Session;
  handlers: ActionHandlers;
}

export function RecommendedActions({ session, handlers }: Props) {
  const { categories, total, blocking } = getActionItems(session);
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set(categories[0] ? [categories[0].key] : []));

  if (total === 0) return null;

  const toggleCat = (k: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3 space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Anomalies &amp; Actions</span>
        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{total} action{total === 1 ? "" : "s"}</span>
        {blocking > 0 && (
          <span className="text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded-full">{blocking} blocking</span>
        )}
      </div>

      {categories.map((cat) => (
        <CategoryCard
          key={cat.key}
          category={cat}
          open={openCats.has(cat.key)}
          onToggle={() => toggleCat(cat.key)}
          handlers={handlers}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  category, open, onToggle, handlers,
}: {
  category: ActionCategory;
  open: boolean;
  onToggle: () => void;
  handlers: ActionHandlers;
}) {
  const Icon = ICONS[category.iconKey] ?? Circle;
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{category.label}</span>
          <span className="text-[10px] font-medium bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full">
            {category.items.length} action{category.items.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {open ? "Collapse" : "Expand"}
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {category.items.map((item) => (
            <ActionCard key={item.actionId} item={item} handlers={handlers} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({ item, handlers }: { item: ActionItemView; handlers: ActionHandlers }) {
  const [open, setOpen] = useState(false);
  const [performing, setPerforming] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const sev = SEVERITY_STYLE[item.severity];
  const prio = priorityBadge(item.priority);

  async function decide(decision: "accept" | "reject" | "complete") {
    // For send_email actions, "accept" opens the modal — handled by caller.
    try {
      if (decision === "accept" || decision === "complete") {
        setPerforming(true);
        if (decision === "accept") {
          // small loader so the UI registers the operation
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      await handlers.decide(item.actionId, decision);
    } finally {
      setPerforming(false);
    }
  }

  async function handleUpload(file: File) {
    if (!item.uploadParams) return;
    setPerforming(true);
    try {
      const summary = await handlers.uploadDocument(item.actionId, file, {
        operation: item.uploadParams.operation,
        sourceDocId: item.uploadParams.source_doc_id,
        triggersRerun: item.uploadParams.triggers_rerun,
      });
      if (summary) setUploadSummary(summary);
    } finally {
      setPerforming(false);
    }
  }

  async function handleEmailSend(payload: { to: string; subject: string; body: string }) {
    setPerforming(true);
    try {
      await handlers.sendEmail(item.actionId, payload);
      setEmailOpen(false);
    } finally {
      setPerforming(false);
    }
  }

  const statusPill =
    item.status === "accepted"
      ? { label: "Performed", cls: "bg-success/10 text-success border-success/20" }
      : item.status === "completed"
      ? { label: "Marked complete", cls: "bg-primary/10 text-primary border-primary/20" }
      : item.status === "rejected"
      ? { label: "Dismissed", cls: "bg-destructive/10 text-destructive border-destructive/20" }
      : { label: "Pending", cls: "bg-warning/10 text-warning border-warning/20" };

  // Approve is disabled only when there's an actual upload box rendered (the
  // user must drop a file to perform the action). Legacy upload-type actions
  // with no params block fall back to a plain accept.
  const hasUploadBox = item.kind === "upload_document" && !!item.uploadParams;
  const acceptDisabled = hasUploadBox;

  return (
    <div className="rounded-xl border border-primary/[0.08] bg-background/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-primary/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-foreground truncate">{item.title}</span>
          <span className={cn("shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full border", sev.pill)}>{sev.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", statusPill.cls)}>{statusPill.label}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {open ? "Collapse" : "Expand"}
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-primary/[0.06]">
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
              {prettyTrigger(item.uiTrigger)}
            </span>
            {item.targetRole && (
              <span className="text-[10px] text-muted-foreground">→ {item.targetRole}</span>
            )}
            {prio && <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", prio.cls)}>{prio.label}</span>}
            {item.blocking && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">Blocking</span>
            )}
          </div>

          {item.context && <p className="text-[12px] text-muted-foreground leading-relaxed">{item.context}</p>}
          {item.whatToCheck && (
            <p className="text-[12px] text-foreground/60 leading-relaxed">
              <span className="font-medium text-foreground/70">What to check:</span> {item.whatToCheck}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/70">
            From anomaly: <span className="text-foreground/60">{item.anomalyTitle}</span>
          </p>
          {item.citations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.citations.map((c, i) => (
                <span key={i} className="text-[10px] text-muted-foreground/80 font-mono bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          )}

          {/* Inline upload area for upload_document actions */}
          {item.kind === "upload_document" && item.uploadParams && item.status === "pending" && (
            <DocumentUploadBox
              operation={item.uploadParams.operation}
              triggersRerun={item.uploadParams.triggers_rerun}
              documentName={item.uploadParams.document_name}
              sourceDocId={item.uploadParams.source_doc_id}
              busy={performing}
              onUpload={handleUpload}
            />
          )}

          {/* Success banner shown immediately after a file upload completes */}
          {uploadSummary && (
            <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div className="text-[12px] leading-relaxed">
                <p className="font-medium text-success">
                  {uploadSummary.operation === "update" ? "Replaced" : "Added"}{" "}
                  <span className="font-mono">{uploadSummary.filename}</span>
                </p>
                <p className="text-success/80 text-[11px]">
                  Session now has <span className="font-semibold">{uploadSummary.total_files} file{uploadSummary.total_files === 1 ? "" : "s"}</span>
                  {uploadSummary.pushed_to_salesforce && " · synced to Salesforce"}
                  {uploadSummary.triggers_rerun && " · re-running Reader + Pricing"}
                </p>
              </div>
            </div>
          )}

          {/* Footer: three-button decision row */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-primary/[0.06]">
            <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {hasUploadBox
                ? "Upload above to perform; or mark complete / dismiss."
                : item.kind === "send_email" && item.emailParams
                ? "Approve opens the email composer."
                : "Approve will perform this action."}
            </p>
            {performing ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
                <Loader2 className="w-4 h-4 animate-spin" /> Performing task…
              </span>
            ) : item.status === "pending" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => decide("reject")}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-destructive text-white hover:bg-destructive transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => decide("complete")}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary transition-colors"
                  title="Mark as complete without automation"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Complete
                </button>
                <button
                  onClick={() => {
                    if (item.kind === "send_email" && item.emailParams) setEmailOpen(true);
                    else if (!acceptDisabled) decide("accept");
                  }}
                  disabled={acceptDisabled}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg text-white transition-colors",
                    acceptDisabled ? "bg-success/40 cursor-not-allowed" : "bg-success hover:bg-success"
                  )}
                  title={acceptDisabled ? "Upload a file above to approve" : ""}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
              </div>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[12px] font-medium",
                  item.status === "accepted" ? "text-success"
                  : item.status === "completed" ? "text-primary"
                  : "text-destructive"
                )}
              >
                {item.status === "accepted" ? <CheckCircle2 className="w-4 h-4" />
                  : item.status === "completed" ? <Check className="w-4 h-4" />
                  : <XCircle className="w-4 h-4" />}
                {item.status === "accepted" ? "Task performed"
                  : item.status === "completed" ? "Marked complete"
                  : "Dismissed"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Email compose modal — rendered only for send_email kinds */}
      {item.kind === "send_email" && item.emailParams && (
        <EmailComposeModal
          open={emailOpen}
          initialTo={item.emailParams.recipient_email ?? ""}
          initialSubject={item.emailParams.subject}
          initialBody={item.emailParams.body}
          recipientRole={item.emailParams.recipient_role}
          recipientName={item.emailParams.recipient_name}
          onClose={() => setEmailOpen(false)}
          onSend={handleEmailSend}
        />
      )}
    </div>
  );
}
