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
  critical: "text-destructive",
  warning: "text-warning",
  positive: "text-success",
  info: "text-primary",
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
        "flex items-start gap-3 py-3 px-3 transition-colors hover:bg-white/40 rounded-lg group",
        index !== 0 && "border-t border-black/[0.04]"
      )}
    >
      <div className={cn("p-1 rounded mt-0.5 flex-shrink-0", SEVERITY_COLOR[insight.severity])}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug">
          <span className="font-semibold">{insight.headline}</span>
          <span className="text-muted-foreground"> — {insight.summary}</span>
        </p>
        <Link
          href="/console"
          className="inline-flex items-center text-[11px] font-medium text-primary hover:text-primary/80 transition-colors mt-1 opacity-0 group-hover:opacity-100"
        >
          {insight.actionLabel ?? "Investigate"}
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
