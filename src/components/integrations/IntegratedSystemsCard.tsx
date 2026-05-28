"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntegrationChip = {
  id: string;
  name: string;
  logoSrc: string;
  connected: boolean;
};

export function IntegratedSystemsCard({
  items,
  className,
}: {
  items: IntegrationChip[];
  className?: string;
}) {
  const connectedCount = items.filter((i) => i.connected).length;
  const totalCount = items.length;

  return (
    <div className={cn("glass-card rounded-xl px-4 py-3 w-fit max-w-full", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">
          Integrated Systems
        </p>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {connectedCount}/{totalCount} connected
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-nowrap overflow-x-auto pb-0.5">
        {items.map((tool) => (
          <div
            key={tool.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full border bg-background/40 backdrop-blur shrink-0",
              tool.connected ? "border-emerald-500/20" : "border-muted-foreground/15"
            )}
            title={tool.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tool.logoSrc}
              alt={tool.name}
              className="w-5 h-5 rounded object-contain bg-white"
            />
            <span className="text-[12px] font-medium text-foreground/80 whitespace-nowrap">
              {tool.name}
            </span>
            {tool.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

