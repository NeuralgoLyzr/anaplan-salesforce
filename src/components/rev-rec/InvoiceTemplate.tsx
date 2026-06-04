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
      <article className="prose prose-sm max-w-none whitespace-pre-wrap text-[#242d48]">
        {inv.markdown}
      </article>
    );
  }

  return (
    <article className="font-sans text-[#242d48] space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-6 pb-4 border-b border-[#e6ebf8]">
        <div>
          <h2 className="text-[1.375rem] leading-[1.5] font-semibold">Invoice</h2>
          <p className="text-[0.75rem] font-mono text-[#485478] mt-1">{inv.id}</p>
          {inv.sequence != null && (
            <p className="text-[0.75rem] text-[#485478]">Cycle {inv.sequence}</p>
          )}
        </div>
        <div className="text-right text-[0.75rem] text-[#485478] space-y-0.5">
          {inv.issueDate && <p><span className="text-[#242d48]">Issued:</span> {inv.issueDate}</p>}
          {inv.dueDate && <p><span className="text-[#242d48]">Due:</span> {inv.dueDate}</p>}
          {inv.paymentTerms && <p><span className="text-[#242d48]">Terms:</span> {inv.paymentTerms}</p>}
          {inv.periodLabel && <p><span className="text-[#242d48]">Period:</span> {inv.periodLabel}</p>}
        </div>
      </header>

      {/* Parties */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[0.75rem]">
        <Party title="From" party={inv.vendor} />
        <Party title="Bill to" party={inv.customer} />
      </section>

      {/* References */}
      {inv.references && (inv.references.poNumber || inv.references.contractReference || inv.references.ssaReference) && (
        <section className="rounded-[4px] border border-[#e6ebf8] bg-[#f0f1f7] px-3 py-2 text-[0.75rem] text-[#485478] flex flex-wrap gap-x-4 gap-y-1">
          {inv.references.poNumber && <span><span className="text-[#242d48]">PO:</span> {inv.references.poNumber}</span>}
          {inv.references.contractReference && <span><span className="text-[#242d48]">Contract:</span> {inv.references.contractReference}</span>}
          {inv.references.ssaReference && <span><span className="text-[#242d48]">SSA:</span> {inv.references.ssaReference}</span>}
        </section>
      )}

      {/* Line items */}
      <section>
        <table className="w-full text-[0.75rem]">
          <thead>
            <tr className="border-b border-[#e6ebf8]">
              <th className="text-left py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Description</th>
              <th className="text-left py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Period</th>
              <th className="text-right py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Qty</th>
              <th className="text-right py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Unit</th>
              <th className="text-right py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-center text-[#485478]">No line items.</td>
              </tr>
            ) : (
              inv.lineItems.map((li, i) => (
                <tr key={li.lineItemId ?? i} className="border-b border-[#e6ebf8]/60">
                  <td className="py-1.5 align-top">{li.description}</td>
                  <td className="py-1.5 align-top text-[#485478]">{li.periodLabel ?? "—"}</td>
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
        <dl className="text-[0.75rem] space-y-1 min-w-[200px]">
          {inv.subtotal != null && (
            <div className="flex justify-between">
              <dt className="text-[#485478]">Subtotal</dt>
              <dd className="font-mono tabular-nums">{fmt(inv.subtotal, inv.currency)}</dd>
            </div>
          )}
          {inv.taxTotal != null && (
            <div className="flex justify-between">
              <dt className="text-[#485478]">Tax</dt>
              <dd className="font-mono tabular-nums">{fmt(inv.taxTotal, inv.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-[#e6ebf8] font-semibold">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{inv.total ?? fmt(inv.totalNumber, inv.currency)}</dd>
          </div>
        </dl>
      </section>

      {inv.notes && (
        <section className="text-[0.75rem] text-[#485478] border-t border-[#e6ebf8] pt-3">
          <p className="font-semibold text-[#242d48] mb-0.5">Notes</p>
          <p className="whitespace-pre-wrap">{inv.notes}</p>
        </section>
      )}
    </article>
  );
}

function Party({ title, party }: { title: string; party: { name: string; address: string | null; billingContact: string | null; taxId: string | null; poReference?: string | null } | null }) {
  return (
    <div className="rounded-[4px] border border-[#e6ebf8] p-3">
      <p className="text-[0.75rem] uppercase text-[#485478] font-semibold mb-1">{title}</p>
      {party ? (
        <div className="space-y-0.5">
          <p className="font-semibold text-[#242d48]">{party.name}</p>
          {party.address && <p className="text-[#485478] whitespace-pre-line">{party.address}</p>}
          {party.billingContact && <p className="text-[#485478]">{party.billingContact}</p>}
          {party.taxId && <p className="text-[#485478]">Tax ID: {party.taxId}</p>}
          {party.poReference && <p className="text-[#485478]">PO: {party.poReference}</p>}
        </div>
      ) : (
        <p className="text-[#485478]">—</p>
      )}
    </div>
  );
}
