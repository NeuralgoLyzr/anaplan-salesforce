"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader } from "@/components/ui/loader";
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
    <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] flex flex-col overflow-hidden min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e6ebf8]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[4px] bg-[#f0f1f7] flex items-center justify-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-[#3c67ea]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{title}</span>
              {count != null && count > 0 && (
                <span className="text-[0.75rem] font-medium bg-[#f0f1f7] text-[#3c67ea] px-1.5 py-0.5 rounded-[2px]">
                  {count}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[0.75rem] text-[#485478]">{subtitle}</p>
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
          <div className="absolute inset-0 flex items-center justify-center bg-white  z-10">
            <Loader size="small" />
          </div>
        )}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-[4px] bg-[#f0f1f7] flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-[#3c67ea]" />
            </div>
            <p className="text-[0.875rem] leading-[1.2] font-medium text-[#242d48]">{emptyTitle}</p>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] mt-1 max-w-[260px] leading-[1.2]">
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
