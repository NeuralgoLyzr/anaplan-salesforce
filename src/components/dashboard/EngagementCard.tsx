"use client";

import { motion } from "framer-motion";
import { Briefcase, Clock, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EngagementData } from "@/lib/types";

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const typeBadgeColors: Record<string, string> = {
  "Total Rewards Review": "bg-primary/10 text-primary border-primary/20",
  "Health Benefits": "bg-success/10 text-success border-success/20",
  "Workers Compensation": "bg-warning/10 text-warning border-warning/20",
  Retirement: "bg-secondary/10 text-secondary border-secondary/20",
  Compensation: "bg-primary/10 text-primary border-primary/20",
};

const PROGRESS_STEPS = ["survey", "policy", "competitive", "synthesis"] as const;
const STEP_LABELS: Record<string, string> = {
  competitive: "Comp.",
  synthesis: "Synth.",
};

export function EngagementCard({
  engagement,
  onClick,
}: {
  engagement: EngagementData;
  onClick?: () => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="glass-card rounded-xl p-3.5 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5 flex-shrink-0">
          <Briefcase className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-xs leading-tight">
              {engagement.client}
            </h3>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border flex-shrink-0",
                typeBadgeColors[engagement.type] || "bg-black/[0.04] text-muted-foreground"
              )}
            >
              {engagement.type}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-muted-foreground">{engagement.industry}</span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> {engagement.lastActivity}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {PROGRESS_STEPS.map((step) => (
              <div key={step} className="flex items-center gap-0.5">
                <CircleDot
                  className={cn(
                    "w-2.5 h-2.5",
                    engagement.progress[step]
                      ? "text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]"
                      : "text-muted-foreground/20"
                  )}
                />
                <span className="text-[10px] text-muted-foreground capitalize">
                  {STEP_LABELS[step] ?? step.charAt(0).toUpperCase() + step.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
