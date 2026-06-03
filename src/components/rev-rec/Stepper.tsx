"use client";

import { Check, FileText, Table2, ShieldAlert, Receipt, Loader2, Stamp, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Session, AgentRunStatus } from "@/lib/rev-rec/types";
import { cn } from "@/lib/utils";

type Visual = "done" | "active" | "pending" | "failed";

interface NodeDef {
  key: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  kind: "agent" | "gate";
  visual: (s: Session) => Visual;
}

function agentVisual(status: AgentRunStatus): Visual {
  if (status === "failed") return "failed";
  if (status === "complete") return "done";
  if (status === "running") return "active";
  return "pending";
}

// The full revenue-recognition journey: four agents plus the two human
// approval gates the PRD mandates (revenue plan, then journal-entry posting).
const NODES: NodeDef[] = [
  {
    key: "reader",
    label: "Read",
    sub: "Contract terms",
    icon: FileText,
    kind: "agent",
    visual: (s) => agentVisual(s.agent_outputs.reader.status),
  },
  {
    key: "pricing",
    label: "Price",
    sub: "Allocate & schedule",
    icon: Table2,
    kind: "agent",
    visual: (s) => agentVisual(s.agent_outputs.pricing.status),
  },
  {
    key: "anomaly",
    label: "Anomaly",
    sub: "Flag oddities",
    icon: ShieldAlert,
    kind: "agent",
    visual: (s) => agentVisual(s.agent_outputs.anomaly.status),
  },
  {
    key: "gate1",
    label: "Approve",
    sub: "Revenue plan",
    icon: Stamp,
    kind: "gate",
    visual: (s) => {
      if (s.status === "rejected") return "failed";
      if (s.gates.g1_revenue_plan.status === "approved") return "done";
      if (s.status === "gate1") return "active";
      if (s.status === "billing" || s.status === "gate2" || s.status === "complete") return "done";
      return "pending";
    },
  },
  {
    key: "billing",
    label: "Bill",
    sub: "Invoices & JEs",
    icon: Receipt,
    kind: "agent",
    visual: (s) => agentVisual(s.agent_outputs.billing.status),
  },
  {
    key: "gate2",
    label: "Post",
    sub: "Controller sign-off",
    icon: Stamp,
    kind: "gate",
    visual: (s) => {
      if (s.status === "complete" || s.gates.g4_je_post.status === "approved") return "done";
      if (s.status === "gate2") return "active";
      return "pending";
    },
  },
];

const NODE_STYLE: Record<Visual, { node: string; icon: string; label: string; sub: string }> = {
  done: {
    node: "bg-success border-success text-white shadow-sm shadow-success/30",
    icon: "text-white",
    label: "text-success",
    sub: "text-success/70",
  },
  active: {
    node: "bg-primary border-primary text-white shadow-sm shadow-primary/40",
    icon: "text-white",
    label: "text-primary",
    sub: "text-primary/70",
  },
  pending: {
    node: "bg-background border-border text-muted-foreground/50",
    icon: "text-muted-foreground/40",
    label: "text-muted-foreground/70",
    sub: "text-muted-foreground/40",
  },
  failed: {
    node: "bg-destructive border-destructive text-white shadow-sm shadow-destructive/30",
    icon: "text-white",
    label: "text-destructive",
    sub: "text-destructive/70",
  },
};

// A gate that is awaiting a human reads amber rather than the in-flight sky.
function nodeStyleFor(visual: Visual, kind: NodeDef["kind"]) {
  if (visual === "active" && kind === "gate") {
    return {
      node: "bg-warning border-warning text-white shadow-sm shadow-warning/40",
      icon: "text-white",
      label: "text-warning",
      sub: "text-warning/80",
    };
  }
  return NODE_STYLE[visual];
}

export function Stepper({ session }: { session: Session }) {
  const states = NODES.map((n) => n.visual(session));

  // Furthest node reached drives the fill line behind the nodes.
  let reached = 0;
  states.forEach((v, i) => {
    if (v === "done" || v === "active" || v === "failed") reached = i;
  });
  const fillPct = (reached / (NODES.length - 1)) * 100;
  const failed = states.includes("failed");

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative flex items-start justify-between gap-1 min-w-[520px]">
        {/* Track (behind the nodes), vertically centered on the 36px circles */}
        <div className="absolute left-0 right-0 top-[18px] mx-5 h-[3px] rounded-full bg-border/70" />
        <motion.div
          className={cn(
            "absolute left-0 top-[18px] ml-5 h-[3px] rounded-full",
            failed ? "bg-gradient-to-r from-success to-destructive" : "bg-gradient-to-r from-success to-primary",
          )}
          initial={false}
          animate={{ width: `calc((100% - 2.5rem) * ${fillPct / 100})` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />

        {NODES.map((n, i) => {
          const visual = states[i];
          const style = nodeStyleFor(visual, n.kind);
          const Icon = n.icon;
          const isGate = n.kind === "gate";
          return (
            <div key={n.key} className="relative z-10 flex flex-col items-center text-center w-[84px] flex-shrink-0">
              <div className="relative">
                {/* Pulse ring for whatever is currently happening / awaiting */}
                {visual === "active" && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full animate-ping opacity-60",
                      isGate ? "bg-warning/40" : "bg-primary/40",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "relative w-9 h-9 flex items-center justify-center border-2 transition-colors",
                    isGate ? "rounded-[10px] rotate-45" : "rounded-full",
                    style.node,
                  )}
                >
                  <span className={cn(isGate && "-rotate-45", "flex items-center justify-center")}>
                    {visual === "active" && !isGate ? (
                      <Loader2 className={cn("w-4 h-4 animate-spin", style.icon)} />
                    ) : visual === "done" ? (
                      <Check className={cn("w-4 h-4", style.icon)} />
                    ) : visual === "failed" ? (
                      <X className={cn("w-4 h-4", style.icon)} />
                    ) : (
                      <Icon className={cn("w-4 h-4", style.icon)} />
                    )}
                  </span>
                </div>
              </div>
              <span className={cn("mt-2 text-[11px] font-semibold leading-none", style.label)}>{n.label}</span>
              <span className={cn("mt-1 text-[9.5px] leading-tight", style.sub)}>{n.sub}</span>
              {isGate && (
                <span className={cn("mt-0.5 text-[8px] font-medium uppercase tracking-wider", style.sub)}>
                  Human gate
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
