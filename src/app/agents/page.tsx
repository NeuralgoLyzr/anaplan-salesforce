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
          <div className="w-9 h-9 rounded-[4px] bg-[#f0f1f7] flex items-center justify-center">
            <IconRobot className="w-4 h-4 text-[#3c67ea]" />
          </div>
          <div>
            <p className="text-[0.75rem] uppercase text-[#485478] font-medium">Agents</p>
            <h1 className="text-[1rem] leading-[1.2] font-semibold text-[#242d48]">Agent workspace</h1>
            <p className="text-[0.75rem] text-[#485478] font-medium">
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
            className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex items-start gap-3 hover:bg-[#f0f1f7]] transition-colors"
          >
            <div className="w-9 h-9 rounded-[4px] bg-[#f0f1f7] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#3c67ea]" />
            </div>
            <div>
              <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{title}</p>
              <p className="text-[0.75rem] text-[#485478] mt-0.5 leading-[1.2]">{blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
