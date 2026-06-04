"use client";
import { useState } from "react";
import { IconReceipt } from "@tabler/icons-react";
import { Receipt, Eye, Send, CheckCircle2, FileText, Lock, Clock, XCircle, Download,  } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AgentBulkShell } from "@/components/rev-rec/AgentBulkShell";
import { InvoiceTemplate } from "@/components/rev-rec/InvoiceTemplate";
import type { Session } from "@/lib/rev-rec/types";
import { getInvoices, type InvoiceView, type InvoiceStatus } from "@/lib/rev-rec/view";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
async function postGate2(sessionId: string, invoiceId: string): Promise<Session> {
  const res = await fetch(`/api/companies/${sessionId}/gate2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_id: invoiceId, decision: "approve" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Approval failed");
  return data.session as Session;
}
const STATUS_PILL: Record<InvoiceStatus, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  actionable: { label: "Actionable", cls: "bg-white text-[#ffbb16] border-[#ffbb16]", Icon: Send },
  scheduled:  { label: "Scheduled",  cls: "bg-[#f0f1f7] text-[#485478] border-[#e6ebf8]/30", Icon: Clock },
  paid:       { label: "Sent",       cls: "bg-white text-[#14a687] border-[#14a687]", Icon: CheckCircle2 },
  archived:   { label: "Archived",   cls: "bg-white text-[#db3743] border-[#db3743]", Icon: XCircle },
  rejected:   { label: "Rejected",   cls: "bg-white text-[#db3743] border-[#db3743]", Icon: XCircle },
};
// For the bulk Bills view we surface only the most relevant invoice(s) per
// customer: the single "actionable" one (if any) plus the most recent "paid"
// one. Anything else (scheduled / archived) is hidden here — open the customer
// workspace to see the full invoice list.
function pickHighlightInvoices(invoices: InvoiceView[]): InvoiceView[] {
  const actionable = invoices.find((i) => i.status === "actionable");
  const paid = [...invoices].reverse().find((i) => i.status === "paid");
  const picked: InvoiceView[] = [];
  if (actionable) picked.push(actionable);
  if (paid && (!actionable || paid.id !== actionable.id)) picked.push(paid);
  // Fall back: if nothing matched (e.g. all scheduled), show the first invoice.
  if (picked.length === 0 && invoices.length > 0) picked.push(invoices[0]);
  return picked;
}
export default function BillsAgentPage() {
  return (
    <AgentBulkShell
      title="Billing Agent"
      subtitle="Actionable & latest invoice per customer"
      icon={IconReceipt}
      hasContent={(s) => s.agent_outputs.billing.status === "complete" || getInvoices(s).length > 0}
      // Pending = there's at least one invoice still waiting to be sent
      // ("actionable"). Completed = all invoices have been sent or archived
      // (no actionable ones left).
      isPending={(s) => getInvoices(s).some((i) => i.status === "actionable")}
      emptyHint="No bills generated yet. They appear after billing runs."
      toolbar={(sessions, refresh) => (
        <BulkApproveButton sessions={sessions} refresh={refresh} />
      )}
      rowPill={(s) => {
        const actionable = getInvoices(s).some((i) => i.status === "actionable");
        if (!actionable) return null;
        return (
          <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-2 py-0.5 rounded-[2px] border bg-white text-[#ffbb16] border-[#ffbb16]">
            Action needed
          </span>
        );
      }}
      rowSummary={(s) => {
        const invs = getInvoices(s);
        const actionable = invs.filter((i) => i.status === "actionable").length;
        return (
          <span className="flex items-center gap-2">
            <span className="text-[0.75rem] text-[#485478]">
              {invs.length} invoice{invs.length === 1 ? "" : "s"}
            </span>
            {actionable > 0 && (
              <span className="inline-flex items-center gap-1 text-[0.75rem] font-medium px-1.5 py-0.5 rounded-[2px] border bg-white text-[#ffbb16] border-[#ffbb16]">
                {actionable} actionable
              </span>
            )}
          </span>
        );
      }}
      renderSession={(s, refresh) => (
        <CustomerBills session={s} refresh={refresh} />
      )}
    />
  );
}
function CustomerBills({ session, refresh }: { session: Session; refresh: () => void }) {
  const invoices = getInvoices(session);
  const highlights = pickHighlightInvoices(invoices);
  const [preview, setPreview] = useState<InvoiceView | null>(null);
  if (invoices.length === 0) {
    return (
      <div className="rounded-[4px] border border-[#e6ebf8] bg-white p-4 text-center">
        <Receipt className="w-5 h-5 text-[#3c67ea] mx-auto mb-1.5" />
        <p className="text-[0.75rem] text-[#485478]">No invoices generated.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-[4px] bg-[#f0f1f7] flex items-center justify-center">
          <Receipt className="w-3.5 h-3.5 text-[#3c67ea]" />
        </div>
        <div>
          <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] leading-[1.2]">Action items — invoices</p>
          <p className="text-[0.75rem] text-[#485478]">
            Showing {highlights.length} of {invoices.length} ·
            {" "}{invoices.filter((i) => i.status === "paid").length} sent
            {" · "}{invoices.filter((i) => i.status === "actionable").length} ready to send
          </p>
        </div>
      </div>
      {highlights.map((inv) => (
        <BulkInvoiceCard
          key={inv.id}
          inv={inv}
          onApprove={async () => {
            await postGate2(session.session_id, inv.id);
            refresh();
          }}
          onPreview={() => setPreview(inv)}
        />
      ))}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto p-0">
          <DialogHeader className="px-5 py-3 border-b border-[#e6ebf8]">
            <DialogTitle className="flex items-center gap-2 text-[0.875rem] leading-[1.2]">
              <FileText className="w-4 h-4 text-[#3c67ea]" /> Invoice {preview?.id}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="p-4">
              <InvoiceTemplate inv={preview} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function BulkInvoiceCard({
  inv, onApprove, onPreview,
}: {
  inv: InvoiceView;
  onApprove: () => Promise<void> | void;
  onPreview: () => void;
}) {
  const [sending, setSending] = useState(false);
  const meta = STATUS_PILL[inv.status] ?? STATUS_PILL.scheduled;
  const StatusIcon = meta.Icon;
  const unlocked = inv.lockState === "unlocked";
  const sent = inv.status === "paid";
  async function handleSend() {
    setSending(true);
    try { await onApprove(); }
    finally { setSending(false); }
  }
  return (
    <div className={cn(
      "rounded-[4px] border border-[#e6ebf8] bg-white p-3 transition-all",
      unlocked && "ring-1 ring-primary/30 shadow-[0_2px_4px_rgba(36,45,72,0.15)]"
    )}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] font-mono">{inv.id}</span>
            {inv.sequence != null && (
              <span className="text-[0.75rem] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[2px] bg-[#f0f1f7] text-[#3c67ea]">
                Cycle {inv.sequence}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 text-[0.75rem] font-medium px-2 py-0.5 rounded-[2px] border", meta.cls)}>
              <StatusIcon className="w-3 h-3" /> {meta.label}
            </span>
            {!unlocked && !sent && inv.status === "scheduled" && (
              <span className="inline-flex items-center gap-1 text-[0.75rem] text-[#485478]">
                <Lock className="w-3 h-3" /> Unlocks after the current invoice is sent
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[0.75rem] text-[#485478]">
            {inv.periodLabel && <span>Period: <span className="text-[#242d48]">{inv.periodLabel}</span></span>}
            {inv.total && <span>Total: <span className="text-[#242d48] font-mono">{inv.total}</span></span>}
            {inv.dueDate && <span>Due: <span className="text-[#242d48]">{inv.dueDate}</span></span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onPreview}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          {sent ? (
            <span className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[#14a687]">
              <Download className="w-3.5 h-3.5" /> Sent
            </span>
          ) : unlocked ? (
            <Button size="sm" className="gap-1.5" disabled={sending} onClick={handleSend}>
              {sending ? <Loader size="inline" /> : <Send className="w-3.5 h-3.5" />}
              Approve &amp; Send
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
function BulkApproveButton({ sessions, refresh }: { sessions: Session[]; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const targets = sessions
    .map((s) => {
      const actionable = getInvoices(s).find((i) => i.status === "actionable");
      return actionable ? { sessionId: s.session_id, invoiceId: actionable.id } : null;
    })
    .filter((x): x is { sessionId: string; invoiceId: string } => x != null);
  async function approveAll() {
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const t of targets) {
        await postGate2(t.sessionId, t.invoiceId);
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" className="gap-1.5" disabled={busy || targets.length === 0} onClick={approveAll}>
      {busy ? <Loader size="inline" /> : <Send className="w-3.5 h-3.5" />}
      Bulk approve &amp; send ({targets.length})
    </Button>
  );
}
