"use client";

import { Send, Mic, Paperclip, FileSearch, Calculator, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { SessionStatus } from "@/lib/rev-rec/types";

// A revenue-recognition work-queue item surfaced in the "Needs your attention" panel.
export interface RevRecAction {
  company: string;
  status: SessionStatus;
  label: string;
  detail: string;
  href: string;
}

const QUICK_CHIPS = [
  { icon: FileSearch, label: "Summarize a contract's terms", q: "Summarize the key terms of this contract for revenue recognition" },
  { icon: Calculator, label: "Explain an SSP allocation", q: "Explain how the bundle price was allocated across performance obligations" },
  { icon: ShieldAlert, label: "Check for unusual terms", q: "Review this contract for unusual terms that could affect revenue recognition" },
];

interface SearchBarProps {
  query: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

export function SearchBar({ query, onChange, onSubmit }: SearchBarProps) {
  return (
    <div className="mt-6 w-full max-w-2xl">
      {/* Input */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Ask about a contract, allocation, or journal entry…"
          className="w-full bg-[#f8f8fa] shadow-[0_0_0_1px_#7885ab] rounded-[2px] pl-5 pr-28 py-4 text-[0.8125rem] leading-[1.2] focus:outline-none placeholder:text-[#485478]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <label className="p-2 rounded-[2px] text-[#485478] hover:text-[#3c67ea] hover:bg-[#f0f1f7] transition-colors cursor-pointer" title="Attach contract">
            <Paperclip className="w-4 h-4" />
            <input type="file" className="hidden" />
          </label>
          <button className="p-2 rounded-[2px] text-[#485478] hover:text-[#3c67ea] hover:bg-[#f0f1f7] transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={onSubmit}
            disabled={!query.trim()}
            className="p-2.5 rounded-[4px] bg-[#3c67ea] text-white hover:bg-[#1947ba] active:bg-[#0b2265] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 "
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick action chips */}
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {QUICK_CHIPS.map(({ icon: Icon, label, q }) => (
          <Link
            key={label}
            href={`/console?q=${encodeURIComponent(q)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[0.75rem] font-medium text-[#485478] bg-white border border-[#e6ebf8] hover:bg-[#f0f1f7] hover:text-[#242d48] transition-colors"
          >
            <Icon className="w-3 h-3" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
