"use client";

import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import type { Session } from "@/lib/rev-rec/types";
import { getJournalEntries, jeTotals, type JournalEntry } from "@/lib/rev-rec/view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  session: Session;
  busy: boolean;
  onPost: () => Promise<void> | void;
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function JournalEntriesPanel({ session, busy, onPost }: Props) {
  const entries = getJournalEntries(session);
  const totals = jeTotals(entries);
  const gate = session.gates.g4_je_post;
  const posted = gate?.status === "approved";

  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <BookOpen className="w-6 h-6 text-primary/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No journal entries generated.</p>
      </div>
    );
  }

  // Balanced when DR === CR (within a 1¢ tolerance — fp safety).
  const balanced = Math.abs(totals.dr - totals.cr) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">Journal entries</p>
            <p className="text-[11px] text-muted-foreground">
              {entries.length} entr{entries.length === 1 ? "y" : "ies"} ·
              {" "}DR <span className="font-mono">{fmt(totals.dr)}</span>
              {" "}CR <span className="font-mono">{fmt(totals.cr)}</span>
              {" "}<span className={cn("font-medium", balanced ? "text-success" : "text-destructive")}>
                {balanced ? "balanced" : "unbalanced"}
              </span>
            </p>
          </div>
        </div>
        {posted ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20">
            <CheckCircle2 className="w-4 h-4" /> Posted
          </span>
        ) : (
          <Button size="sm" className="gap-1.5" disabled={busy || !balanced} onClick={() => onPost()}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Post to ledger
          </Button>
        )}
      </div>

      {entries.map((e, i) => (
        <JEEntry key={i} e={e} />
      ))}
    </div>
  );
}

function JEEntry({ e }: { e: JournalEntry }) {
  const drTotal = e.lines.reduce((acc, l) => acc + (l.dr ?? 0), 0);
  const crTotal = e.lines.reduce((acc, l) => acc + (l.cr ?? 0), 0);
  const balanced = Math.abs(drTotal - crTotal) < 0.01;

  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{e.type}</p>
          {e.memo && <p className="text-[12px] text-muted-foreground">{e.memo}</p>}
        </div>
        <div className="flex items-center gap-2">
          {e.date && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{e.date}</span>
          )}
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
            balanced ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20",
          )}>
            {balanced ? "Balanced" : "Unbalanced"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-primary/[0.07]">
        <table className="w-full text-[12px]">
          <thead className="bg-primary/[0.03]">
            <tr>
              <th className="text-left px-3 py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Account</th>
              <th className="text-right px-3 py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">DR</th>
              <th className="text-right px-3 py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">CR</th>
            </tr>
          </thead>
          <tbody>
            {e.lines.map((l, i) => (
              <tr key={i} className="border-t border-primary/[0.05]">
                <td className="px-3 py-1.5 text-foreground/80">{l.account}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">{l.dr != null ? fmt(l.dr) : ""}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">{l.cr != null ? fmt(l.cr) : ""}</td>
              </tr>
            ))}
            <tr className="border-t border-primary/[0.1] font-semibold bg-primary/[0.02]">
              <td className="px-3 py-1.5 text-foreground/70">Totals</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{fmt(drTotal)}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{fmt(crTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
