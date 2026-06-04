"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineTab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  panel: ReactNode;
}

interface Props {
  tabs: PipelineTab[];
  defaultTab?: string;
}

export function PipelineTabs({ tabs, defaultTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activePanel = tabs.find((t) => t.id === active)?.panel;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-[#f0f1f7] rounded-[4px] p-1 w-fit flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[0.75rem] font-medium transition-all",
                isActive
                  ? "bg-white text-[#242d48] shadow-[0_2px_4px_rgba(36,45,72,0.15)]"
                  : "text-[#485478] hover:text-[#242d48]"
              )}
            >
              <Icon
                className={cn(
                  "w-3.5 h-3.5",
                  isActive ? "text-[#3c67ea]" : "text-[#485478]"
                )}
              />
              {tab.label}
              {tab.badge != null && (
                <span
                  className={cn(
                    "ml-0.5 text-[0.75rem] px-1.5 py-0.5 rounded-[2px] leading-[1.2] font-semibold",
                    isActive
                      ? "bg-[#f0f1f7] text-[#3c67ea]"
                      : "bg-[#f0f1f7]-foreground/10 text-[#485478]"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div>{activePanel}</div>
    </div>
  );
}
