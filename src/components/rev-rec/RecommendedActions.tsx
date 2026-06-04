"use client";
import { useState } from "react";
import { Sparkles, ChevronDown, ChevronRight, CheckCircle2, XCircle, Mail, CalendarClock, FileText, ClipboardCheck, Database, Circle, Check,  } from "lucide-react";
import type { Session } from "@/lib/rev-rec/types";
import {
  getActionItems, prettyTrigger, SEVERITY_STYLE,
  type ActionItemView, type ActionCategory,
} from "@/lib/rev-rec/view";
import { cn } from "@/lib/utils";
import { DocumentUploadBox } from "./DocumentUploadBox";
import { EmailComposeModal } from "./EmailComposeModal";
import { Loader } from "@/components/ui/loader";
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail, calendar: CalendarClock, file: FileText, review: ClipboardCheck, record: Database, dot: Circle,
};
function priorityBadge(p: string): { label: string; cls: string } | null {
  if (p === "before_approval") return { label: "Before approval", cls: "bg-white text-[#ffbb16] border-[#ffbb16]" };
  if (p === "post_approval") return { label: "After approval", cls: "bg-[#f0f1f7] text-[#485478] border-[#e6ebf8]/50" };
  if (p === "informational") return { label: "Informational", cls: "bg-[#e6ebf8] text-[#3c67ea] border-[#e6ebf8]" };
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
    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-3 space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-[#3c67ea]" />
        <span className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">Anomalies &amp; Actions</span>
        <span className="text-[0.75rem] font-medium bg-[#e6ebf8] text-[#3c67ea] px-1 py-0 rounded-[2px] border border-[#e6ebf8] uppercase">{total} action{total === 1 ? "" : "s"}</span>
        {blocking > 0 && (
          <span className="text-[0.75rem] font-medium bg-white text-[#db3743] border border-[#f2919d] px-1 py-0 rounded-[2px] uppercase">{blocking} blocking</span>
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
    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f0f1f7] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-[#3c67ea]" />
          </div>
          <span className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{category.label}</span>
          <span className="text-[0.75rem] font-medium bg-[#f0f1f7] text-[#485478] px-1.5 py-0.5 rounded-[2px]">
            {category.items.length} action{category.items.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[0.75rem] text-[#485478]">
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
      ? { label: "Performed", cls: "bg-white text-[#14a687] border-[#14a687]" }
      : item.status === "completed"
      ? { label: "Marked complete", cls: "bg-[#e6ebf8] text-[#3c67ea] border-[#e6ebf8]" }
      : item.status === "rejected"
      ? { label: "Dismissed", cls: "bg-white text-[#db3743] border-[#f2919d]" }
      : { label: "Pending", cls: "bg-white text-[#ffbb16] border-[#ffbb16]" };
  // Approve is disabled only when there's an actual upload box rendered (the
  // user must drop a file to perform the action). Legacy upload-type actions
  // with no params block fall back to a plain accept.
  const hasUploadBox = item.kind === "upload_document" && !!item.uploadParams;
  const acceptDisabled = hasUploadBox;
  return (
    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[#f0f1f7] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-[#242d48] truncate">{item.title}</span>
          <span className={cn("shrink-0 text-[0.75rem] font-medium px-1 py-0 rounded-[2px] border", sev.pill)}>{sev.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[0.75rem] font-medium px-1 py-0 rounded-[2px] border", statusPill.cls)}>{statusPill.label}</span>
          <span className="flex items-center gap-1 text-[0.75rem] text-[#485478]">
            {open ? "Collapse" : "Expand"}
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-[#e6ebf8]">
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[0.75rem] font-medium px-1.5 py-0.5 rounded-[2px] bg-[#f0f1f7] text-[#485478] border border-[#e6ebf8]">
              {prettyTrigger(item.uiTrigger)}
            </span>
            {item.targetRole && (
              <span className="text-[0.75rem] text-[#485478]">→ {item.targetRole}</span>
            )}
            {prio && <span className={cn("text-[0.75rem] font-medium px-1 py-0 rounded-[2px] border", prio.cls)}>{prio.label}</span>}
            {item.blocking && (
              <span className="text-[0.75rem] font-medium px-1.5 py-0.5 rounded-[2px] bg-white text-[#db3743] border border-[#f2919d]">Blocking</span>
            )}
          </div>
          {item.context && <p className="text-[0.75rem] text-[#485478] leading-[1.2]">{item.context}</p>}
          {item.whatToCheck && (
            <p className="text-[0.75rem] text-[#242d48] leading-[1.2]">
              <span className="font-medium text-[#242d48]">What to check:</span> {item.whatToCheck}
            </p>
          )}
          <p className="text-[0.75rem] text-[#485478]">
            From anomaly: <span className="text-[#242d48]">{item.anomalyTitle}</span>
          </p>
          {item.citations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.citations.map((c, i) => (
                <span key={i} className="text-[0.75rem] text-[#485478] font-mono bg-[#f0f1f7] border border-[#e6ebf8] px-1.5 py-0.5 rounded">{c}</span>
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
            <div className="flex items-start gap-2 rounded-[4px] border border-[#14a687] bg-white px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-[#14a687] shrink-0 mt-0.5" />
              <div className="text-[0.75rem] leading-[1.2]">
                <p className="font-medium text-[#14a687]">
                  {uploadSummary.operation === "update" ? "Replaced" : "Added"}{" "}
                  <span className="font-mono">{uploadSummary.filename}</span>
                </p>
                <p className="text-[#14a687] text-[0.75rem]">
                  Session now has <span className="font-semibold">{uploadSummary.total_files} file{uploadSummary.total_files === 1 ? "" : "s"}</span>
                  {uploadSummary.pushed_to_salesforce && " · synced to Salesforce"}
                  {uploadSummary.triggers_rerun && " · re-running Reader + Pricing"}
                </p>
              </div>
            </div>
          )}
          {/* Footer: three-button decision row */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#e6ebf8]">
            <p className="text-[0.75rem] text-[#485478] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {hasUploadBox
                ? "Upload above to perform; or mark complete / dismiss."
                : item.kind === "send_email" && item.emailParams
                ? "Approve opens the email composer."
                : "Approve will perform this action."}
            </p>
            {performing ? (
              <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[#14a687]">
                <Loader size="inline" /> Performing task…
              </span>
            ) : item.status === "pending" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => decide("reject")}
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-3 py-1.5 rounded-[4px] bg-[#db3743] text-white hover:bg-[#db3743] transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => decide("complete")}
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-3 py-1.5 rounded-[4px] bg-[#3c67ea] text-white hover:bg-[#3c67ea] transition-colors"
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
                    "inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-3 py-1.5 rounded-[4px] text-white transition-colors",
                    acceptDisabled ? "bg-white cursor-not-allowed" : "bg-[#14a687] hover:bg-[#14a687]"
                  )}
                  title={acceptDisabled ? "Upload a file above to approve" : ""}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
              </div>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[0.75rem] font-medium",
                  item.status === "accepted" ? "text-[#14a687]"
                  : item.status === "completed" ? "text-[#3c67ea]"
                  : "text-[#db3743]"
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
