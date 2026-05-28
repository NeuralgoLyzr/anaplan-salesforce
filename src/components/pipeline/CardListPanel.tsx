"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PanelShell } from "./PanelShell";
import { cn } from "@/lib/utils";
import type { TaskCard } from "@/lib/pipeline-types";

export type { TaskCard };

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  "Todo":        "bg-slate-400/10 text-slate-500 border-slate-300/30",
  "In Progress": "bg-blue-500/10 text-blue-600 border-blue-400/20",
  "Done":        "bg-emerald-500/10 text-emerald-600 border-emerald-400/20",
  "Blocked":     "bg-red-500/10 text-red-600 border-red-400/20",
  "Review":      "bg-amber-500/10 text-amber-600 border-amber-400/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600",
  high:     "bg-orange-500/10 text-orange-600",
  medium:   "bg-amber-500/10 text-amber-600",
  low:      "bg-slate-400/10 text-slate-500",
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
            "bg-muted/60 text-muted-foreground border-border/30";
          const priorityCls = card.priority
            ? (PRIORITY_COLORS[card.priority.toLowerCase()] ?? "")
            : "";

          return (
            <li
              key={`${card.id}-${i}`}
              className="rounded-xl border border-primary/[0.08] bg-background/30 px-4 py-3 hover:bg-background/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {typeof card.id === "number" && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      {card.id}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {card.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {card.owner && (
                        <span>
                          Owner:{" "}
                          <span className="text-foreground/70">{card.owner}</span>
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
                          <span className="font-medium text-foreground/60">
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
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/60 border border-primary/10"
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
                      "text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize",
                      statusCls
                    )}
                  >
                    {card.status}
                  </span>
                  {card.priority && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full capitalize",
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
