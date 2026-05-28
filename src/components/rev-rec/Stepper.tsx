"use client";

import { Check, FileText, Table2, ShieldAlert, Receipt, Loader2 } from "lucide-react";
import type { Session, SessionStatus, AgentRunStatus } from "@/lib/rev-rec/types";
import { cn } from "@/lib/utils";

interface Step {
  key: "reader" | "pricing" | "anomaly" | "billing";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { key: "reader",  label: "Read",    icon: FileText     },
  { key: "pricing", label: "Price",   icon: Table2       },
  { key: "anomaly", label: "Anomaly", icon: ShieldAlert  },
  { key: "billing", label: "Bill",    icon: Receipt      },
];

type Visual = "done" | "active" | "pending" | "failed";

function visualFor(status: AgentRunStatus, overall: SessionStatus, key: Step["key"]): Visual {
  if (status === "failed") return "failed";
  if (status === "complete") return "done";
  if (status === "running") return "active";
  // Pending agents that are next-up while the pipeline is at the matching gate
  // remain "pending" — the gate itself is what's blocking.
  if (key === "pricing" && overall === "gate1") return "done";
  if (key === "billing" && overall === "gate2") return "done";
  if (overall === "complete") return "done";
  return "pending";
}

const STYLE: Record<Visual, { wrap: string; icon: string; label: string }> = {
  done:    { wrap: "bg-emerald-500/10 border-emerald-400/30 text-emerald-700", icon: "text-emerald-600", label: "text-emerald-700" },
  active:  { wrap: "bg-sky-500/10 border-sky-400/30 text-sky-700",              icon: "text-sky-600",     label: "text-sky-700" },
  pending: { wrap: "bg-muted/40 border-border/60 text-muted-foreground",        icon: "text-muted-foreground/60", label: "text-muted-foreground" },
  failed:  { wrap: "bg-red-500/10 border-red-400/30 text-red-700",              icon: "text-red-600",     label: "text-red-700" },
};

export function Stepper({ session }: { session: Session }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3 w-full overflow-x-auto">
      {STEPS.map((s, i) => {
        const out = session.agent_outputs[s.key];
        const visual = visualFor(out.status, session.status, s.key);
        const style = STYLE[visual];
        const Icon = s.icon;
        return (
          <li key={s.key} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg border", style.wrap)}>
              <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", style.icon)}>
                {visual === "active" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : visual === "done" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className={cn("text-[11px] font-medium uppercase tracking-wide", style.label)}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 min-w-[16px] bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
