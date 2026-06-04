"use client";
import { Check, FileText, Table2, ShieldAlert, Receipt, Stamp, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Session, AgentRunStatus } from "@/lib/rev-rec/types";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
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
    node: "bg-[#14a687] border-[#14a687] text-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] shadow-success/30",
    icon: "text-white",
    label: "text-[#14a687]",
    sub: "text-[#14a687]",
  },
  active: {
    node: "bg-[#3c67ea] border-[#3c67ea] text-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] shadow-primary/40",
    icon: "text-white",
    label: "text-[#3c67ea]",
    sub: "text-[#3c67ea]",
  },
  pending: {
    node: "bg-white border-[#e6ebf8] text-[#485478]",
    icon: "text-[#485478]",
    label: "text-[#485478]",
    sub: "text-[#485478]",
  },
  failed: {
    node: "bg-[#db3743] border-[#db3743] text-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] shadow-destructive/30",
    icon: "text-white",
    label: "text-[#db3743]",
    sub: "text-[#db3743]",
  },
};
// A gate that is awaiting a human reads amber rather than the in-flight sky.
function nodeStyleFor(visual: Visual, kind: NodeDef["kind"]) {
  if (visual === "active" && kind === "gate") {
    return {
      node: "bg-[#ffbb16] border-[#ffbb16] text-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] shadow-warning/40",
      icon: "text-white",
      label: "text-[#ffbb16]",
      sub: "text-[#ffbb16]",
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
        <div className="absolute left-0 right-0 top-[18px] mx-5 h-px bg-[#e6ebf8]" />
        <motion.div
          className={cn(
            "absolute left-0 top-[18px] ml-5 h-px",
            failed ? "bg-[#db3743]" : "bg-[#14a687]",
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
                      "absolute inset-0 rounded-[2px] opacity-30",
                      isGate ? "bg-white" : "bg-[#f0f1f7]",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "relative w-9 h-9 flex items-center justify-center border-2 transition-colors",
                    isGate ? "rounded-[2px] rotate-45" : "rounded-full",
                    style.node,
                  )}
                >
                  <span className={cn(isGate && "-rotate-45", "flex items-center justify-center")}>
                    {visual === "active" && !isGate ? (
                      <Loader size="inline" />
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
              <span className={cn("mt-2 text-[0.75rem] font-medium leading-[1.2]", style.label)}>{n.label}</span>
              <span className={cn("mt-1 text-[0.75rem] leading-[1.2]", style.sub)}>{n.sub}</span>
              {isGate && (
                <span className={cn("mt-0.5 text-[0.75rem] font-medium uppercase", style.sub)}>
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
