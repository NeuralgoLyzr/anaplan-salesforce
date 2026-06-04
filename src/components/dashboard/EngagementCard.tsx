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
  "Total Rewards Review": "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]",
  "Health Benefits": "bg-white text-[#14a687] border-[#14a687]",
  "Workers Compensation": "bg-white text-[#ffbb16] border-[#ffbb16]",
  Retirement: "bg-[#f0f1f7] text-[#485478] border-[#e6ebf8]",
  Compensation: "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]",
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
      className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-[4px] bg-[#f0f1f7] text-[#3c67ea] mt-0.5 flex-shrink-0">
          <Briefcase className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-[#242d48] text-[0.75rem] uppercase tracking-[0.08em] leading-[1.2]">
              {engagement.client}
            </h3>
            <span
              className={cn(
                "text-[0.75rem] uppercase tracking-[0.08em] font-semibold px-2 py-0.5 rounded-[2px] border flex-shrink-0",
                typeBadgeColors[engagement.type] || "bg-[#f0f1f7] text-[#485478]"
              )}
            >
              {engagement.type}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[0.75rem] text-[#485478]">{engagement.industry}</span>
            <span className="text-[0.75rem] text-[#485478] flex items-center gap-0.5">
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
                      ? "text-[#3c67ea]"
                      : "text-[#485478]"
                  )}
                />
                <span className="text-[0.75rem] text-[#485478] capitalize">
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
