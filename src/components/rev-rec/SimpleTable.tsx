"use client";

import { formatCell, humanizeKey, type TableView } from "@/lib/rev-rec/view";
import { cn } from "@/lib/utils";

interface Props {
  view: TableView;
  emptyLabel?: string;
  className?: string;
}

// Generic table renderer for agent JSON: takes a normalized columns+rows view
// (see toTableView in lib/rev-rec/view.ts) and renders it with humanized
// column headers and right-aligned numeric cells.
export function SimpleTable({ view, emptyLabel = "No data.", className }: Props) {
  const { columns, rows } = view;

  if (!columns.length || !rows.length) {
    return (
      <p className="text-xs text-muted-foreground py-2">{emptyLabel}</p>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-primary/[0.07]", className)}>
      <table className="w-full text-left text-[12px]">
        <thead className="bg-primary/[0.03]">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="px-3 py-2 font-semibold uppercase tracking-wide text-[10px] text-muted-foreground whitespace-nowrap"
              >
                {humanizeKey(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-primary/[0.05] hover:bg-primary/[0.02]">
              {columns.map((c) => {
                const v = row[c];
                const isNum = typeof v === "number";
                return (
                  <td
                    key={c}
                    className={cn(
                      "px-3 py-1.5 align-top whitespace-nowrap text-foreground/80",
                      isNum && "font-mono tabular-nums text-right",
                    )}
                  >
                    {formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
