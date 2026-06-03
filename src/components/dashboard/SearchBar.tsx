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
          className="w-full glass-input rounded-[18px] pl-5 pr-28 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/40"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <label className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer" title="Attach contract">
            <Paperclip className="w-4 h-4" />
            <input type="file" className="hidden" />
          </label>
          <button className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={onSubmit}
            disabled={!query.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-gradient-end text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/10"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-muted-foreground bg-primary/[0.06] hover:bg-primary/[0.12] hover:text-primary border border-primary/10 transition-all"
          >
            <Icon className="w-3 h-3" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
