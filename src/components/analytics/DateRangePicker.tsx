"use client";

import React from "react";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 p-1.5 rounded-[4px] border border-[#e6ebf8] bg-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] w-fit max-w-full overflow-x-auto">
      <Calendar className="w-4 h-4 text-[#485478] ml-2 flex-shrink-0" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="bg-transparent border-none outline-none text-[0.875rem] leading-[1.2] font-semibold px-2 py-1 cursor-pointer hover:bg-[#f0f1f7] dark:hover:bg-transparent rounded-[4px] transition-colors flex-shrink-0"
      />
      <span className="text-[#485478] text-[0.875rem] leading-[1.2] font-semibold flex-shrink-0">→</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="bg-transparent border-none outline-none text-[0.875rem] leading-[1.2] font-semibold px-2 py-1 cursor-pointer hover:bg-[#f0f1f7] dark:hover:bg-transparent rounded-[4px] transition-colors flex-shrink-0"
      />
    </div>
  );
}
