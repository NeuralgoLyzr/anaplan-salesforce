"use client";

import { motion } from "framer-motion";
import { Send, Mic, Paperclip, ArrowRight, ClipboardList, FileSearch, BarChart3, Sparkles } from "lucide-react";
import Link from "next/link";
import { IntegratedSystemsCard } from "@/components/integrations/IntegratedSystemsCard";
import { cn } from "@/lib/utils";
import type { SuggestedAction } from "@/lib/types";

const CLIENT_LOGOS: Record<string, string> = {
  "Meridian Manufacturing": "https://www.google.com/s2/favicons?domain=emerson.com&sz=64",
  "TechCorp Solutions": "https://www.google.com/s2/favicons?domain=salesforce.com&sz=64",
  "Pacific Foods Inc.": "https://www.google.com/s2/favicons?domain=generalmills.com&sz=64",
};

const QUICK_CHIPS = [
  { icon: ClipboardList, label: "Design a Meridian survey", href: "/console" },
  { icon: FileSearch, label: "Analyze Meridian policies", href: "/console" },
  { icon: BarChart3, label: "Benchmark Meridian competitors", href: "/console" },
  { icon: Sparkles, label: "Synthesize Meridian recommendations", href: "/console" },
];

interface SearchBarProps {
  query: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  suggestedActions: SuggestedAction[];
}

export function SearchBar({ query, onChange, onSubmit, suggestedActions }: SearchBarProps) {
  return (
    <div className="mt-6 w-full max-w-2xl">
      {/* Input */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="How can I help with your engagement?"
          className="w-full glass-input rounded-[18px] pl-5 pr-28 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/40"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <label className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer" title="Attach file">
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
        {QUICK_CHIPS.map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-muted-foreground bg-primary/[0.06] hover:bg-primary/[0.12] hover:text-primary border border-primary/10 transition-all"
          >
            <Icon className="w-3 h-3" />
            {label}
          </Link>
        ))}
      </div>

      {/* Integrated Systems card (between suggested inputs and suggested actions) */}
      <div className="mt-3 flex justify-center">
        <IntegratedSystemsCard
          className="max-w-full"
          items={[
            { id: "salesforce", name: "Salesforce", logoSrc: "/Salesforce.com_logo.svg.png", connected: true },
            { id: "anaplan-mcp", name: "Anaplan MCP", logoSrc: "/PLAN-82aa46a2.png", connected: true },
          ]}
        />
      </div>

      {/* Suggested actions panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4 w-full rounded-xl overflow-hidden text-left bg-white/[0.2] backdrop-blur-xl border border-white/[0.18] shadow-sm"
      >
        <div className="px-3.5 py-1.5 border-b border-white/[0.15]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">
            Suggested Actions
          </p>
        </div>
        {suggestedActions.map((action, idx) => (
          <Link key={idx} href={action.href}>
            <div
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2 hover:bg-white/[0.3] transition-colors cursor-pointer group",
                idx !== 0 && "border-t border-white/[0.12]"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CLIENT_LOGOS[action.client] ?? ""}
                alt={action.client}
                className="w-5 h-5 rounded object-contain flex-shrink-0"
              />
              <p className="text-[11px] text-foreground/70 flex-1 min-w-0 truncate">
                {action.label} for <span className="font-semibold text-foreground">{action.client}</span>
              </p>
              <ArrowRight className="w-3 h-3 text-primary/0 group-hover:text-primary/50 transition-colors flex-shrink-0" />
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
