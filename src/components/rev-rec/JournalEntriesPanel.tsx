"use client";
import { BookOpen, CheckCircle2 } from "lucide-react";
import type { Session } from "@/lib/rev-rec/types";
import { getJournalEntries, jeTotals, type JournalEntry } from "@/lib/rev-rec/view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
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
      <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-6 text-center">
        <BookOpen className="w-6 h-6 text-[#3c67ea] mx-auto mb-2" />
        <p className="text-[0.875rem] leading-[1.2] text-[#485478]">No journal entries generated.</p>
      </div>
    );
  }
  // Balanced when DR === CR (within a 1¢ tolerance — fp safety).
  const balanced = Math.abs(totals.dr - totals.cr) < 0.01;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-[#3c67ea]" />
          </div>
          <div>
            <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] leading-[1.2]">Journal entries</p>
            <p className="text-[0.75rem] text-[#485478]">
              {entries.length} entr{entries.length === 1 ? "y" : "ies"} ·
              {" "}DR <span className="font-mono">{fmt(totals.dr)}</span>
              {" "}CR <span className="font-mono">{fmt(totals.cr)}</span>
              {" "}<span className={cn("font-medium", balanced ? "text-[#14a687]" : "text-[#db3743]")}>
                {balanced ? "balanced" : "unbalanced"}
              </span>
            </p>
          </div>
        </div>
        {posted ? (
          <span className="inline-flex items-center gap-1.5 inline-flex items-center gap-1.5 py-2 px-4 rounded-[2px] text-[0.875rem] font-semibold text-white bg-[#14a687] hover:bg-[#1d7f5c] active:bg-[#094b34] transition-all duration-200">
            <CheckCircle2 className="w-4 h-4" /> Posted
          </span>
        ) : (
          <Button size="sm" className="gap-1.5" disabled={busy || !balanced} onClick={() => onPost()}>
            {busy ? <Loader size="inline" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#242d48]">{e.type}</p>
          {e.memo && <p className="text-[0.75rem] text-[#485478]">{e.memo}</p>}
        </div>
        <div className="flex items-center gap-2">
          {e.date && (
            <span className="text-[0.75rem] text-[#485478] whitespace-nowrap">{e.date}</span>
          )}
          <span className={cn(
            "text-[0.75rem] font-medium px-1.5 py-0.5 rounded-[2px] border",
            balanced ? "bg-white text-[#14a687] border border-[#14a687]" : "bg-white text-[#db3743] border border-[#f2919d]",
          )}>
            {balanced ? "Balanced" : "Unbalanced"}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-[4px] border border-[#e6ebf8]">
        <table className="w-full text-[0.75rem]">
          <thead className="bg-[#f0f1f7]]">
            <tr>
              <th className="text-left px-3 py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Account</th>
              <th className="text-right px-3 py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">DR</th>
              <th className="text-right px-3 py-1.5 font-semibold text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">CR</th>
            </tr>
          </thead>
          <tbody>
            {e.lines.map((l, i) => (
              <tr key={i} className="border-t border-[#e6ebf8]">
                <td className="px-3 py-1.5 text-[#242d48]">{l.account}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">{l.dr != null ? fmt(l.dr) : ""}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">{l.cr != null ? fmt(l.cr) : ""}</td>
              </tr>
            ))}
            <tr className="border-t border-[#e6ebf8] font-semibold bg-[#f0f1f7]]">
              <td className="px-3 py-1.5 text-[#242d48]">Totals</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{fmt(drTotal)}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{fmt(crTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
