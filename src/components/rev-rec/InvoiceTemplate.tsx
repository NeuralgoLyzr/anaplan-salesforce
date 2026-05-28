"use client";

import type { InvoiceView } from "@/lib/rev-rec/view";

function fmt(n: number | null, currency?: string | null): string {
  if (n == null) return "—";
  const v = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${v}` : v;
}

// Print-friendly invoice rendering. Used both inside the preview dialog and
// inside a hidden `print-area` div for window.print().
export function InvoiceTemplate({ inv }: { inv: InvoiceView }) {
  // Legacy fallback: some older billing payloads only ship a markdown blob.
  if (inv.markdown && inv.lineItems.length === 0) {
    return (
      <article className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/80">
        {inv.markdown}
      </article>
    );
  }

  return (
    <article className="font-sans text-foreground space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-6 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoice</h2>
          <p className="text-[12px] font-mono text-muted-foreground mt-1">{inv.id}</p>
          {inv.sequence != null && (
            <p className="text-[11px] text-muted-foreground">Cycle {inv.sequence}</p>
          )}
        </div>
        <div className="text-right text-[12px] text-muted-foreground space-y-0.5">
          {inv.issueDate && <p><span className="text-foreground/60">Issued:</span> {inv.issueDate}</p>}
          {inv.dueDate && <p><span className="text-foreground/60">Due:</span> {inv.dueDate}</p>}
          {inv.paymentTerms && <p><span className="text-foreground/60">Terms:</span> {inv.paymentTerms}</p>}
          {inv.periodLabel && <p><span className="text-foreground/60">Period:</span> {inv.periodLabel}</p>}
        </div>
      </header>

      {/* Parties */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
        <Party title="From" party={inv.vendor} />
        <Party title="Bill to" party={inv.customer} />
      </section>

      {/* References */}
      {inv.references && (inv.references.poNumber || inv.references.contractReference || inv.references.ssaReference) && (
        <section className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          {inv.references.poNumber && <span><span className="text-foreground/60">PO:</span> {inv.references.poNumber}</span>}
          {inv.references.contractReference && <span><span className="text-foreground/60">Contract:</span> {inv.references.contractReference}</span>}
          {inv.references.ssaReference && <span><span className="text-foreground/60">SSA:</span> {inv.references.ssaReference}</span>}
        </section>
      )}

      {/* Line items */}
      <section>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Description</th>
              <th className="text-left py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Period</th>
              <th className="text-right py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Qty</th>
              <th className="text-right py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Unit</th>
              <th className="text-right py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-center text-muted-foreground">No line items.</td>
              </tr>
            ) : (
              inv.lineItems.map((li, i) => (
                <tr key={li.lineItemId ?? i} className="border-b border-border/60">
                  <td className="py-1.5 align-top">{li.description}</td>
                  <td className="py-1.5 align-top text-muted-foreground">{li.periodLabel ?? "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{li.quantity ?? "—"}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{fmt(li.unitPrice, inv.currency)}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{fmt(li.total, inv.currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Totals */}
      <section className="flex justify-end">
        <dl className="text-[12px] space-y-1 min-w-[200px]">
          {inv.subtotal != null && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-mono tabular-nums">{fmt(inv.subtotal, inv.currency)}</dd>
            </div>
          )}
          {inv.taxTotal != null && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="font-mono tabular-nums">{fmt(inv.taxTotal, inv.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-border font-semibold">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{inv.total ?? fmt(inv.totalNumber, inv.currency)}</dd>
          </div>
        </dl>
      </section>

      {inv.notes && (
        <section className="text-[11px] text-muted-foreground border-t border-border pt-3">
          <p className="font-semibold text-foreground/70 mb-0.5">Notes</p>
          <p className="whitespace-pre-wrap">{inv.notes}</p>
        </section>
      )}
    </article>
  );
}

function Party({ title, party }: { title: string; party: { name: string; address: string | null; billingContact: string | null; taxId: string | null; poReference?: string | null } | null }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{title}</p>
      {party ? (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">{party.name}</p>
          {party.address && <p className="text-muted-foreground whitespace-pre-line">{party.address}</p>}
          {party.billingContact && <p className="text-muted-foreground">{party.billingContact}</p>}
          {party.taxId && <p className="text-muted-foreground">Tax ID: {party.taxId}</p>}
          {party.poReference && <p className="text-muted-foreground">PO: {party.poReference}</p>}
        </div>
      ) : (
        <p className="text-muted-foreground">—</p>
      )}
    </div>
  );
}
