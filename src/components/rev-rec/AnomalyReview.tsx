"use client";

import { useState } from "react";
import { ShieldAlert, AlertTriangle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { Session } from "@/lib/rev-rec/types";
import {
  getAnomalies, getAnomalyRecommendation, groupBySeverity, SEVERITY_STYLE, type Severity,
} from "@/lib/rev-rec/view";
import { cn } from "@/lib/utils";

export function AnomalyReview({ session }: { session: Session }) {
  const anomalies = getAnomalies(session);
  const groups = groupBySeverity(anomalies);
  const recommendation = getAnomalyRecommendation(session);
  const status = session.agent_outputs.anomaly.status;
  const failed = status === "failed";
  const running = status === "running" || status === "pending";
  const onHold = recommendation === "hold";

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">Anomaly review</p>
            <p className="text-[11px] text-muted-foreground">{anomalies.length} finding{anomalies.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        {recommendation && (
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-full border",
              onHold ? "bg-red-500/10 text-red-600 border-red-400/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-400/20"
            )}
          >
            {recommendation.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {running && (
        <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 border border-sky-400/20 px-3 py-2 text-[12px] text-sky-700">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Reviewing for anomalies…
        </div>
      )}

      {failed && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2 text-[12px] text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Anomaly review unavailable — proceed with caution.
        </div>
      )}

      {!running && !failed && groups.length === 0 && (
        <p className="text-xs text-muted-foreground">No anomalies detected.</p>
      )}

      {groups.map((g) => (
        <AnomalyGroup key={g.severity} severity={g.severity} items={g.items} />
      ))}
    </div>
  );
}

function AnomalyGroup({ severity, items }: { severity: Severity; items: ReturnType<typeof getAnomalies> }) {
  const style = SEVERITY_STYLE[severity];
  const defaultOpen = severity === "critical" || severity === "high";
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-primary/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-primary/[0.02] hover:bg-primary/[0.04] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", style.dot)} />
          <span className="text-[12px] font-semibold text-foreground">{style.label}</span>
          <span className="text-[10px] text-muted-foreground">({items.length})</span>
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <ul className="divide-y divide-primary/[0.05]">
          {items.map((a, i) => (
            <li key={i} className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-foreground">{a.title}</p>
                {a.category && (
                  <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/60">{a.category}</span>
                )}
              </div>
              {a.detail && <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{a.detail}</p>}
              {a.why && <p className="text-[12px] text-foreground/60 mt-1 leading-relaxed"><span className="font-medium text-foreground/70">Why it matters:</span> {a.why}</p>}
              {a.whatToCheck && <p className="text-[12px] text-foreground/60 mt-1 leading-relaxed"><span className="font-medium text-foreground/70">What to check:</span> {a.whatToCheck}</p>}
              {a.recommendation && <p className="text-[12px] text-foreground/60 mt-1 leading-relaxed"><span className="font-medium text-foreground/70">Recommendation:</span> {a.recommendation}</p>}
              {a.citations.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {a.citations.map((c, ci) => (
                    <span key={ci} className="text-[10px] text-muted-foreground/80 font-mono bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
