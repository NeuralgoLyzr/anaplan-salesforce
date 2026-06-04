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
    <div className={cn("bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] px-4 py-3 w-fit max-w-full", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.75rem] font-semibold uppercase text-[#242d48]">
          Integrated Systems
        </p>
        <p className="text-[0.75rem] text-[#485478] tabular-nums">
          {connectedCount}/{totalCount} connected
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-nowrap overflow-x-auto pb-0.5">
        {items.map((tool) => (
          <div
            key={tool.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-[2px] border bg-[#f0f1f7]  shrink-0",
              tool.connected ? "border-[#14a687]" : "border-[#e6ebf8]-foreground/15"
            )}
            title={tool.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tool.logoSrc}
              alt={tool.name}
              className="w-5 h-5 rounded object-contain bg-white"
            />
            <span className="text-[0.75rem] font-medium text-[#242d48] whitespace-nowrap">
              {tool.name}
            </span>
            {tool.connected ? (
              <CheckCircle2 className="w-4 h-4 text-[#14a687]" />
            ) : (
              <XCircle className="w-4 h-4 text-[#485478]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

