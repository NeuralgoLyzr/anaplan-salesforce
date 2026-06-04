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
    <motion.div variants={itemVariants} className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] px-3.5 py-2.5 cursor-pointer group">
      <h3 className="text-[0.75rem] font-medium text-[#485478] mb-0.5 uppercase">
        {metric.label}
      </h3>
      <span className="text-[1rem] leading-[1.2] font-semibold font-mono text-[#242d48] tabular-nums">
        <AnimatedValue value={metric.value} />
      </span>
      <div className="mt-1 flex items-center gap-1.5 text-[0.75rem]">
        <span
          className={cn(
            "inline-flex items-center font-medium px-1 py-0 rounded-[2px] border uppercase",
            metric.changeType === "positive"
              ? "text-[#14a687] bg-white border-[#14a687]"
              : metric.changeType === "negative"
              ? "text-[#db3743] bg-white border-[#f2919d]"
              : "text-[#485478] bg-[#f0f1f7] border-[#e6ebf8]"
          )}
        >
          {metric.trend === "up" && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
          {metric.trend === "down" && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
          {metric.change}
        </span>
        {metric.detail && (
          <span className="text-[#485478] text-[0.75rem] truncate">{metric.detail}</span>
        )}
      </div>
    </motion.div>
  );
}
