"use client";

import { motion } from "framer-motion";
import { Send, Mic, Paperclip, ArrowRight, FileSearch, Calculator, ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { IntegratedSystemsCard } from "@/components/integrations/IntegratedSystemsCard";
import { STATUS_META } from "@/lib/rev-rec/ui";
import type { SessionStatus } from "@/lib/rev-rec/types";
import { cn } from "@/lib/utils";

// A revenue-recognition work-queue item surfaced under the chat bar.
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
  suggestedActions: RevRecAction[];
  onActionClick?: (href: string) => void;
}

export function SearchBar({ query, onChange, onSubmit, suggestedActions, onActionClick }: SearchBarProps) {
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

      {/* Integrated Systems card */}
      <div className="mt-3 flex justify-center">
        <IntegratedSystemsCard
          className="max-w-full"
          items={[
            { id: "salesforce", name: "Salesforce", logoSrc: "/Salesforce.com_logo.svg.png", connected: true },
            { id: "anaplan-mcp", name: "Anaplan MCP", logoSrc: "/PLAN-82aa46a2.png", connected: true },
          ]}
        />
      </div>

      {/* Suggested actions — the human-in-the-loop approval queue */}
      {suggestedActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 w-full rounded-xl overflow-hidden text-left bg-white/[0.2] backdrop-blur-xl border border-white/[0.18] shadow-sm"
        >
          <div className="px-3.5 py-1.5 border-b border-white/[0.15]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">
              Needs your attention
            </p>
          </div>
          {suggestedActions.map((action, idx) => {
            const meta = STATUS_META[action.status];
            return (
              <div
                key={idx}
                onClick={() => onActionClick?.(action.href)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2 hover:bg-white/[0.3] transition-colors cursor-pointer group",
                  idx !== 0 && "border-t border-white/[0.12]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0",
                    meta.pill,
                  )}
                >
                  {meta.busy && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground/80 truncate">
                    {action.label} for <span className="font-semibold text-foreground">{action.company}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">{action.detail}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-primary/0 group-hover:text-primary/50 transition-colors flex-shrink-0" />
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
