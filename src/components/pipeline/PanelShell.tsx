"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count?: number;
  isLoading?: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function PanelShell({
  icon: Icon,
  title,
  subtitle,
  count,
  isLoading,
  isEmpty,
  emptyTitle,
  emptyDescription,
  headerActions,
  children,
}: Props) {
  return (
    <div className="glass-card rounded-xl flex flex-col overflow-hidden min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              {count != null && count > 0 && (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-primary/30" />
            </div>
            <p className="text-sm font-medium text-foreground/70">{emptyTitle}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
              {emptyDescription}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
