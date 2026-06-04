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
  actionable: { label: "Actionable", cls: "bg-white text-[#ffbb16] border-[#ffbb16]", Icon: Send },
  scheduled:  { label: "Scheduled",  cls: "bg-[#f0f1f7] text-[#485478] border-[#e6ebf8]/30", Icon: Clock },
  paid:       { label: "Sent",       cls: "bg-white text-[#14a687] border-[#14a687]", Icon: CheckCircle2 },
  archived:   { label: "Archived",   cls: "bg-white text-[#db3743] border-[#f2919d]", Icon: XCircle },
  rejected:   { label: "Rejected",   cls: "bg-white text-[#db3743] border-[#f2919d]", Icon: XCircle },
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
      <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-6 text-center">
        <Receipt className="w-6 h-6 text-[#3c67ea] mx-auto mb-2" />
        <p className="text-[0.875rem] leading-[1.2] text-[#485478]">No invoices generated.</p>
      </div>
    );
  }

  const unlockedCount = invoices.filter((i) => i.lockState === "unlocked").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center">
          <Receipt className="w-3.5 h-3.5 text-[#3c67ea]" />
        </div>
        <div>
          <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] leading-[1.2]">Action items — invoices</p>
          <p className="text-[0.75rem] text-[#485478]">
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
          <div className="px-5 py-3 border-t border-[#e6ebf8] flex justify-end">
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
        "rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 transition-all",
        unlocked && "ring-1 ring-primary/30 shadow-[0_2px_4px_rgba(36,45,72,0.15)]"
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] font-mono">{inv.id}</span>
            {inv.sequence != null && (
              <span className="text-[0.75rem] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[2px] border border-[#e6ebf8] bg-[#f0f1f7] text-[#3c67ea]">
                Cycle {inv.sequence}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 text-[0.75rem] font-medium px-1 py-0 rounded-[2px] border uppercase", meta.cls)}>
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
