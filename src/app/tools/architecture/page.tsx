"use client";

import { Cpu, GitBranch, Database, Layers, Shield, Zap, FileText } from "lucide-react";

const ARCHITECTURE_LAYERS = [
  {
    title: "Agent Identity",
    icon: FileText,
    color: "text-[#3c67ea]",
    bg: "bg-[#f0f1f7]",
    files: ["SOUL.md", "RULES.md", "PERSONA.md"],
    description: "Version-controlled agent definitions that govern personality, behavior, and compliance guardrails.",
  },
  {
    title: "Skill Layer",
    icon: Zap,
    color: "text-[#ffbb16]",
    bg: "bg-white",
    files: ["survey-designer.md", "policy-analyzer.md", "competitive-benchmarker.md", "synthesis-recommender.md"],
    description: "Modular skill definitions loaded dynamically based on the active engagement task.",
  },
  {
    title: "Knowledge Base",
    icon: Database,
    color: "text-[#3c67ea]",
    bg: "bg-[#f0f1f7]",
    files: ["wtw-overview.md", "industry-benchmarks.md", "methodology-*.md"],
    description: "Static domain knowledge injected as context — firm methodology, benchmarks, and reference data.",
  },
  {
    title: "Client Workspace",
    icon: GitBranch,
    color: "text-[#14a687]",
    bg: "bg-white",
    files: ["engagement-brief.md", "policy-assessment.md", "employee-survey.md"],
    description: "Per-engagement workspace files — isolated per client, never mixed across engagements.",
  },
  {
    title: "Tool Layer (Composio MCP)",
    icon: Layers,
    color: "text-[#485478]",
    bg: "bg-[#f0f1f7]",
    files: ["Gmail", "Google Sheets", "Perplexity", "Notion", "Google Drive"],
    description: "External tool access via Composio REST API — managed OAuth flows and token refresh.",
  },
  {
    title: "Compliance & Guardrails",
    icon: Shield,
    color: "text-[#db3743]",
    bg: "bg-white",
    files: ["No PII in memory", "ERISA/ACA flags", "Client data isolation", "Actuarial escalation"],
    description: "Hard constraints enforced at every step — never surfaced in tool calls or agent outputs.",
  },
];

export default function AgentArchitecture() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Cpu className="w-6 h-6 text-[#3c67ea]" />
          <h1 className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48]">Agent Architecture</h1>
        </div>
        <p className="text-[0.875rem] leading-[1.2] text-[#485478]">
          GitAgent standard — layered context architecture with version-controlled definitions
        </p>
      </div>

      <div className="space-y-3">
        {ARCHITECTURE_LAYERS.map((layer, idx) => {
          const Icon = layer.icon;
          return (
            <div key={layer.title} className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-[4px] ${layer.bg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${layer.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[0.75rem] font-semibold text-[#485478] font-mono">LAYER {idx + 1}</span>
                    <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{layer.title}</h3>
                  </div>
                  <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] leading-[1.2] mb-2.5">{layer.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.files.map((f) => (
                      <span key={f} className="text-[0.75rem] font-mono bg-[#f0f1f7] text-[#485478] px-2 py-0.5 rounded-[4px]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
