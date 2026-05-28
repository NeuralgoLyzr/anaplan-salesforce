"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardMetric } from "@/lib/types";

function AnimatedValue({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [value]);
  return (
    <span className={cn("transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")}>
      {value}
    </span>
  );
}

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <motion.div variants={itemVariants} className="glass-card rounded-xl px-3.5 py-2.5 cursor-pointer group">
      <h3 className="text-[9px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">
        {metric.label}
      </h3>
      <span className="text-lg font-bold font-mono tracking-tight text-foreground tabular-nums">
        <AnimatedValue value={metric.value} />
      </span>
      <div className="mt-1 flex items-center gap-1.5 text-[9px]">
        <span
          className={cn(
            "flex items-center font-medium px-1 py-0.5 rounded",
            metric.changeType === "positive"
              ? "text-success bg-success/10"
              : metric.changeType === "negative"
              ? "text-destructive bg-destructive/10"
              : "text-muted-foreground bg-black/[0.04]"
          )}
        >
          {metric.trend === "up" && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
          {metric.trend === "down" && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
          {metric.change}
        </span>
        {metric.detail && (
          <span className="text-muted-foreground/50 text-[8px] truncate">{metric.detail}</span>
        )}
      </div>
    </motion.div>
  );
}
