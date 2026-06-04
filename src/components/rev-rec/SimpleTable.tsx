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
      <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] py-2">{emptyLabel}</p>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-[4px] border border-[#e6ebf8]", className)}>
      <table className="w-full text-left text-[0.75rem]">
        <thead className="bg-[#f0f1f7]]">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="px-3 py-2 font-semibold uppercase tracking-[0.08em] text-[0.75rem] text-[#485478] whitespace-nowrap"
              >
                {humanizeKey(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[#e6ebf8] hover:bg-[#f0f1f7]]">
              {columns.map((c) => {
                const v = row[c];
                const isNum = typeof v === "number";
                return (
                  <td
                    key={c}
                    className={cn(
                      "px-3 py-1.5 align-top whitespace-nowrap text-[#242d48]",
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
