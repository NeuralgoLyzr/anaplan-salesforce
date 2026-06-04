"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DashboardInsight } from "@/lib/types";

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const SEVERITY_ICON = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  positive: CheckCircle2,
  info: Info,
} as const;

const SEVERITY_COLOR = {
  critical: "text-[#db3743]",
  warning: "text-[#ffbb16]",
  positive: "text-[#14a687]",
  info: "text-[#3c67ea]",
} as const;

export function InsightRow({
  insight,
  index,
}: {
  insight: DashboardInsight;
  index: number;
}) {
  const Icon = SEVERITY_ICON[insight.severity] ?? Info;

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "flex items-start gap-3 py-3 px-3 transition-colors hover:bg-[#f0f1f7] rounded-[4px] group",
        index !== 0 && "border-t border-[#e6ebf8]"
      )}
    >
      <div className={cn("p-1 rounded mt-0.5 flex-shrink-0", SEVERITY_COLOR[insight.severity])}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#242d48] leading-[1.2]">
          <span className="font-medium">{insight.headline}</span>
          <span className="text-[#485478]"> — {insight.summary}</span>
        </p>
        <Link
          href={insight.href ?? "/"}
          className="inline-flex items-center text-[0.75rem] font-medium text-[#3c67ea] hover:text-[#3c67ea] transition-colors mt-1 "
        >
          {insight.actionLabel ?? "Investigate"}
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
