"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PanelShell } from "./PanelShell";
import { cn } from "@/lib/utils";
import type { TaskCard } from "@/lib/pipeline-types";

export type { TaskCard };

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  "Todo":        "bg-[#f0f1f7] text-[#485478] border-[#e6ebf8]/30",
  "In Progress": "bg-[#f0f1f7] text-[#3c67ea] border-[#e6ebf8]",
  "Done":        "bg-white text-[#14a687] border-[#14a687]",
  "Blocked":     "bg-white text-[#db3743] border-[#db3743]",
  "Review":      "bg-white text-[#ffbb16] border-[#ffbb16]",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-white text-[#db3743]",
  high:     "bg-white text-[#ffbb16]",
  medium:   "bg-white text-[#ffbb16]",
  low:      "bg-[#f0f1f7] text-[#485478]",
};

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  cards: TaskCard[];
  isLoading?: boolean;
  headerActions?: ReactNode;
  statusColors?: Record<string, string>;
}

export function CardListPanel({
  icon,
  title,
  subtitle,
  emptyTitle = "No tasks yet",
  emptyDescription = "Scheduled work items will appear here.",
  cards,
  isLoading,
  headerActions,
  statusColors = DEFAULT_STATUS_COLORS,
}: Props) {
  return (
    <PanelShell
      icon={icon}
      title={title}
      subtitle={subtitle}
      count={cards.length}
      isLoading={isLoading}
      isEmpty={cards.length === 0}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      headerActions={headerActions}
    >
      <ul className="p-3 space-y-2">
        {cards.map((card, i) => {
          const statusCls =
            statusColors[card.status] ??
            DEFAULT_STATUS_COLORS[card.status] ??
            "bg-[#f0f1f7] text-[#485478] border-[#e6ebf8]/30";
          const priorityCls = card.priority
            ? (PRIORITY_COLORS[card.priority.toLowerCase()] ?? "")
            : "";

          return (
            <li
              key={`${card.id}-${i}`}
              className="rounded-[4px] border border-[#e6ebf8] bg-white px-4 py-3 hover:bg-white transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {typeof card.id === "number" && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[#f0f1f7] text-[0.75rem] font-semibold text-[#3c67ea]">
                      {card.id}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.875rem] leading-[1.2] font-medium text-[#242d48] leading-[1.2]">
                      {card.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-[#485478]">
                      {card.owner && (
                        <span>
                          Owner:{" "}
                          <span className="text-[#242d48]">{card.owner}</span>
                        </span>
                      )}
                      {(card.start || card.end) && (
                        <span>
                          {card.start ?? "—"} → {card.end ?? "—"}
                        </span>
                      )}
                      {card.dependency && (
                        <span>
                          Depends:{" "}
                          <span className="font-medium text-[#242d48]">
                            #{card.dependency}
                          </span>
                        </span>
                      )}
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {card.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[0.75rem] px-1.5 py-0.5 rounded-[2px] bg-[#f0f1f7] text-[#3c67ea] border border-[#e6ebf8]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "text-[0.75rem] font-medium px-2 py-0.5 rounded-[2px] border capitalize",
                      statusCls
                    )}
                  >
                    {card.status}
                  </span>
                  {card.priority && (
                    <span
                      className={cn(
                        "text-[0.75rem] px-1.5 py-0.5 rounded-[2px] capitalize",
                        priorityCls
                      )}
                    >
                      {card.priority}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PanelShell>
  );
}
