"use client";

import { useEffect, useState } from "react";
import {
  Receipt, Eye, Send, CheckCircle2, Download, FileText, Lock, Clock, XCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/rev-rec/types";
import {
  getInvoices, getInvoiceEmailTemplate, fillInvoiceEmailTemplate,
  type InvoiceView, type InvoiceStatus,
} from "@/lib/rev-rec/view";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { EmailComposeModal } from "./EmailComposeModal";
import { cn } from "@/lib/utils";

interface Props {
  session: Session;
  // Each InvoiceCard awaits this and runs its own local loader, so clicking
  // "Approve & Send" on one invoice doesn't spin other invoices' buttons.
  // Called by send-email flow with the composed email; we POST to the
  // per-invoice send-email route and refresh the session afterwards.
  onSendInvoice: (
    invoiceId: string,
    payload: { to: string; subject: string; body: string },
  ) => Promise<void>;
}

const STATUS_PILL: Record<InvoiceStatus, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  actionable: { label: "Actionable", cls: "bg-warning/10 text-warning border-warning/20", Icon: Send },
  scheduled:  { label: "Scheduled",  cls: "bg-slate-400/10 text-slate-500 border-slate-300/30", Icon: Clock },
  paid:       { label: "Sent",       cls: "bg-success/10 text-success border-success/20", Icon: CheckCircle2 },
  archived:   { label: "Archived",   cls: "bg-destructive/10 text-destructive border-destructive/20", Icon: XCircle },
  rejected:   { label: "Rejected",   cls: "bg-destructive/10 text-destructive border-destructive/20", Icon: XCircle },
};

export function BillsPanel({ session, onSendInvoice }: Props) {
  const invoices = getInvoices(session);
  const emailTemplate = getInvoiceEmailTemplate(session);
  const [preview, setPreview] = useState<InvoiceView | null>(null);
  const [printInv, setPrintInv] = useState<InvoiceView | null>(null);
  // The invoice the user is currently composing an email for — drives both
  // the modal's open state and the placeholder substitutions.
  const [composing, setComposing] = useState<InvoiceView | null>(null);

  // Trigger the browser print dialog once the print area has rendered.
  useEffect(() => {
    if (!printInv) return;
    const t = setTimeout(() => {
      window.print();
      setPrintInv(null);
    }, 80);
    return () => clearTimeout(t);
  }, [printInv]);

  if (invoices.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Receipt className="w-6 h-6 text-primary/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No invoices generated.</p>
      </div>
    );
  }

  const unlockedCount = invoices.filter((i) => i.lockState === "unlocked").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Receipt className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">Action items — invoices</p>
          <p className="text-[11px] text-muted-foreground">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            {unlockedCount > 0 && ` · ${unlockedCount} ready to send`}
          </p>
        </div>
      </div>

      {invoices.map((inv) => (
        <InvoiceCard
          key={inv.id}
          inv={inv}
          onApproveAndSend={() => setComposing(inv)}
          onPreview={() => setPreview(inv)}
          onPrint={() => setPrintInv(inv)}
        />
      ))}

      {/* Email composer for the currently-actionable invoice. */}
      {composing && (() => {
        const filled = emailTemplate
          ? fillInvoiceEmailTemplate(emailTemplate, composing)
          : { subject: `Invoice ${composing.id}`, body: `Please find attached invoice ${composing.id}.` };
        const pdfUrl = `/api/companies/${session.session_id}/invoices/${encodeURIComponent(composing.id)}/pdf`;
        return (
          <EmailComposeModal
            open
            initialSubject={filled.subject}
            initialBody={filled.body}
            initialTo={composing.customer?.billingContact === "Accounts Payable" ? "" : ""}
            recipientRole="Customer billing contact"
            recipientName={composing.customer?.name ?? null}
            attachment={{
              filename: `${composing.id}.pdf`,
              url: pdfUrl,
              contentType: "application/pdf",
              sizeHint: "Invoice PDF",
            }}
            onClose={() => setComposing(null)}
            onSend={async ({ to, subject, body }) => {
              await onSendInvoice(composing.id, { to, subject, body });
              setComposing(null);
            }}
          />
        );
      })()}

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto p-0">
          <DialogHeader className="px-5 py-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-primary" /> Invoice {preview?.id}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="p-4">
              <InvoiceTemplate inv={preview} />
            </div>
          )}
          <div className="px-5 py-3 border-t border-border flex justify-end">
            <Button variant="outline" className="gap-1.5" onClick={() => preview && setPrintInv(preview)}>
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden print area — visible only when printing (see globals.css) */}
      {printInv && (
        <div className="print-area">
          <InvoiceTemplate inv={printInv} />
        </div>
      )}
    </div>
  );
}

function InvoiceCard({
  inv, onApproveAndSend, onPreview, onPrint,
}: {
  inv: InvoiceView;
  onApproveAndSend: () => void;
  onPreview: () => void;
  onPrint: () => void;
}) {
  const meta = STATUS_PILL[inv.status] ?? STATUS_PILL.scheduled;
  const StatusIcon = meta.Icon;
  const unlocked = inv.lockState === "unlocked";
  const sent = inv.status === "paid";

  return (
    <div
      className={cn(
        "glass-card rounded-xl p-4 transition-all",
        unlocked && "ring-1 ring-primary/30 shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground font-mono">{inv.id}</span>
            {inv.sequence != null && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/70">
                Cycle {inv.sequence}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", meta.cls)}>
              <StatusIcon className="w-3 h-3" /> {meta.label}
            </span>
            {!unlocked && !sent && inv.status === "scheduled" && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="w-3 h-3" /> Unlocks after the current invoice is sent
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[12px] text-muted-foreground">
            {inv.periodLabel && <span>Period: <span className="text-foreground/70">{inv.periodLabel}</span></span>}
            {inv.total && <span>Total: <span className="text-foreground/70 font-mono">{inv.total}</span></span>}
            {inv.dueDate && <span>Due: <span className="text-foreground/70">{inv.dueDate}</span></span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onPreview}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          {sent ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onPrint}>
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
          ) : unlocked ? (
            <Button size="sm" className="gap-1.5" onClick={onApproveAndSend}>
              <Send className="w-3.5 h-3.5" />
              Approve &amp; Send
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
