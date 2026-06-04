"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PanelShell } from "./PanelShell";
import { cn } from "@/lib/utils";

export interface TableColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  key: keyof T & string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => ReactNode;
}

interface Props<T extends Record<string, unknown>> {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  columns: TableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  headerActions?: ReactNode;
  striped?: boolean;
}

export function TablePanel<T extends Record<string, unknown>>({
  icon,
  title,
  subtitle,
  emptyTitle = "No data yet",
  emptyDescription = "Data will appear here once available.",
  columns,
  rows,
  isLoading,
  headerActions,
  striped = false,
}: Props<T>) {
  return (
    <PanelShell
      icon={icon}
      title={title}
      subtitle={subtitle}
      count={rows.length}
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      headerActions={headerActions}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#e6ebf8] bg-[#f0f1f7]]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478] whitespace-nowrap",
                    col.width
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-[#e6ebf8] hover:bg-[#f0f1f7]] transition-colors last:border-0",
                  striped && i % 2 === 1 && "bg-[#f0f1f7]]"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-[0.875rem] leading-[1.2] text-[#242d48]", col.width)}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] != null
                        ? (row[col.key] as ReactNode)
                        : <span className="text-[#485478]">—</span>
                      )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}
