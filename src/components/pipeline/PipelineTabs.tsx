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
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-3.5 h-3.5",
                  isActive ? "text-primary" : "text-muted-foreground/70"
                )}
              />
              {tab.label}
              {tab.badge != null && (
                <span
                  className={cn(
                    "ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full leading-none font-semibold",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted-foreground/10 text-muted-foreground"
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
