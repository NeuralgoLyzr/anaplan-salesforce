"use client";

import { FileText, Calculator, Sigma, Search } from "lucide-react";
import type { Session } from "@/lib/rev-rec/types";
import { getAllocationTrace, type AllocationTraceRow } from "@/lib/rev-rec/view";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

function fmtMoney(n: number | null, ccy?: string): string {
  if (n == null) return "—";
  return `${ccy ? ccy + " " : ""}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// The trust feature: click any allocated figure to see exactly where it came
// from — the source contract line, the inputs that fed it, and how it was computed.
function TracePopover({ row }: { row: AllocationTraceRow }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="group inline-flex items-center gap-1 font-mono tabular-nums text-foreground/90 underline decoration-dotted decoration-primary/50 underline-offset-4 hover:text-primary"
          title="Trace this figure to its source"
        >
          {fmtMoney(row.allocated, row.currency)}
          <Search className="w-3 h-3 text-primary/0 group-hover:text-primary/70 transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        {/* Result */}
        <div className="px-4 py-3 bg-primary/[0.04] border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Allocated revenue</p>
          <p className="text-base font-semibold text-foreground font-mono tabular-nums">{fmtMoney(row.allocated, row.currency)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{row.product}</p>
        </div>

        <div className="p-4 space-y-3">
          {/* Source */}
          <TraceSection icon={FileText} label="Source — contract line">
            <p className="text-[12px] text-foreground/80">{row.product}</p>
            {row.sourceDoc && <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{row.sourceDoc}</p>}
          </TraceSection>

          {/* Inputs */}
          {row.inputs.length > 0 && (
            <TraceSection icon={Sigma} label="Inputs">
              <dl className="space-y-1">
                {row.inputs.map((f) => (
                  <div key={f.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] text-muted-foreground">{f.label}</dt>
                    <dd className="text-[11px] font-medium text-foreground/90 text-right font-mono tabular-nums">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </TraceSection>
          )}

          {/* Calculation */}
          <TraceSection icon={Calculator} label="Calculation — on Anaplan">
            {row.recognition && (
              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent text-accent-foreground mb-1">
                {row.recognition.replace(/_/g, " ")}
              </span>
            )}
            <p className="text-[11px] text-foreground/80 leading-snug">{row.schedule ?? "Recognition schedule computed on the Anaplan model."}</p>
          </TraceSection>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TraceSection({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-primary/70" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="pl-[18px]">{children}</div>
    </div>
  );
}

export function TraceableAllocationTable({ session }: { session: Session }) {
  const rows = getAllocationTrace(session);

  if (!rows.length) {
    return <p className="text-xs text-muted-foreground py-2">No allocation returned by Pricing.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-primary/[0.07]">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-primary/[0.03]">
          <tr>
            {["Product", "Allocated revenue", "Recognition", "Schedule"].map((c) => (
              <th key={c} className="px-3 py-2 font-semibold uppercase tracking-wide text-[10px] text-muted-foreground whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-primary/[0.05] hover:bg-primary/[0.02]">
              <td className="px-3 py-1.5 align-top text-foreground/80">{row.product}</td>
              <td className="px-3 py-1.5 align-top text-right whitespace-nowrap">
                <TracePopover row={row} />
              </td>
              <td className="px-3 py-1.5 align-top text-foreground/70 whitespace-nowrap">{row.recognition?.replace(/_/g, " ") ?? "—"}</td>
              <td className="px-3 py-1.5 align-top text-foreground/70 max-w-[280px] truncate" title={row.schedule}>{row.schedule ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-primary/[0.05] bg-primary/[0.01]">
        Click any allocated figure to trace it to its contract line, inputs, and calculation.
      </p>
    </div>
  );
}
