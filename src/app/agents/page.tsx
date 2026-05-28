"use client";

import Link from "next/link";
import { IconRobot, IconFileText, IconCoin, IconShieldExclamation, IconReceipt } from "@tabler/icons-react";
import { IntegratedSystemsCard } from "@/components/integrations/IntegratedSystemsCard";

const AGENTS = [
  {
    href: "/agents/reader",
    title: "Reader Agent",
    blurb: "Bulk overview of every customer's contract intake — uploaded files, brief, and overall progress.",
    icon: IconFileText,
  },
  {
    href: "/agents/pricing",
    title: "Pricing Agent",
    blurb: "Bulk-review revenue allocation and monthly projection across customers; approve in place.",
    icon: IconCoin,
  },
  {
    href: "/agents/anomaly",
    title: "Anomaly Agent",
    blurb: "Roll-up of anomaly findings and recommended actions, with bulk accept/reject.",
    icon: IconShieldExclamation,
  },
  {
    href: "/agents/bills",
    title: "Billing Agent",
    blurb: "Actionable + latest invoice per customer, with bulk approve & send.",
    icon: IconReceipt,
  },
];

export default function AgentsIndexPage() {
  return (
    <div className="space-y-5 px-4 sm:px-6 py-5 pb-12">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconRobot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Agents</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Agent workspace</h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              Bulk-review responses from each agent, grouped by customer.
            </p>
          </div>
        </div>
      </div>

      <IntegratedSystemsCard
        items={[
          { id: "salesforce", name: "Salesforce", logoSrc: "/Salesforce.com_logo.svg.png", connected: true },
          { id: "anaplan-mcp", name: "Anaplan MCP", logoSrc: "/PLAN-82aa46a2.png", connected: true },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AGENTS.map(({ href, title, blurb, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="glass-card rounded-xl p-4 flex items-start gap-3 hover:bg-primary/[0.03] transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
