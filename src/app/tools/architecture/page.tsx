"use client";

import { Cpu, GitBranch, Database, Layers, Shield, Zap, FileText } from "lucide-react";

const ARCHITECTURE_LAYERS = [
  {
    title: "Agent Identity",
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10",
    files: ["SOUL.md", "RULES.md", "PERSONA.md"],
    description: "Version-controlled agent definitions that govern personality, behavior, and compliance guardrails.",
  },
  {
    title: "Skill Layer",
    icon: Zap,
    color: "text-warning",
    bg: "bg-warning/10",
    files: ["survey-designer.md", "policy-analyzer.md", "competitive-benchmarker.md", "synthesis-recommender.md"],
    description: "Modular skill definitions loaded dynamically based on the active engagement task.",
  },
  {
    title: "Knowledge Base",
    icon: Database,
    color: "text-primary",
    bg: "bg-primary/10",
    files: ["wtw-overview.md", "industry-benchmarks.md", "methodology-*.md"],
    description: "Static domain knowledge injected as context — firm methodology, benchmarks, and reference data.",
  },
  {
    title: "Client Workspace",
    icon: GitBranch,
    color: "text-success",
    bg: "bg-success/10",
    files: ["engagement-brief.md", "policy-assessment.md", "employee-survey.md"],
    description: "Per-engagement workspace files — isolated per client, never mixed across engagements.",
  },
  {
    title: "Tool Layer (Composio MCP)",
    icon: Layers,
    color: "text-secondary",
    bg: "bg-secondary/10",
    files: ["Gmail", "Google Sheets", "Perplexity", "Notion", "Google Drive"],
    description: "External tool access via Composio REST API — managed OAuth flows and token refresh.",
  },
  {
    title: "Compliance & Guardrails",
    icon: Shield,
    color: "text-destructive",
    bg: "bg-destructive/10",
    files: ["No PII in memory", "ERISA/ACA flags", "Client data isolation", "Actuarial escalation"],
    description: "Hard constraints enforced at every step — never surfaced in tool calls or agent outputs.",
  },
];

export default function AgentArchitecture() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Cpu className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agent Architecture</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          GitAgent standard — layered context architecture with version-controlled definitions
        </p>
      </div>

      <div className="space-y-3">
        {ARCHITECTURE_LAYERS.map((layer, idx) => {
          const Icon = layer.icon;
          return (
            <div key={layer.title} className="glass-card rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${layer.bg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${layer.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold text-muted-foreground/40 font-mono">LAYER {idx + 1}</span>
                    <h3 className="text-sm font-semibold text-foreground">{layer.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">{layer.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.files.map((f) => (
                      <span key={f} className="text-[10px] font-mono bg-black/[0.04] text-muted-foreground px-2 py-0.5 rounded-lg">
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
