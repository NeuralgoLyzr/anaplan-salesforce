"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconRobot, IconFileText, IconCoin, IconShieldExclamation, IconReceipt,
  IconFolder, IconFolderOpen, IconFile, IconChevronRight, IconBrandGit,
} from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface LyzrAgentCard {
  key: string;
  step: string;
  id: string | null;
  name: string;
  description: string;
  model: string | null;
  provider: string | null;
  role: string;
  temperature: number | null;
  error?: string;
}
interface TreeNode {
  name: string;
  path: string;
  type: "dir" | "file";
  children?: TreeNode[];
}

const AGENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  reader: IconFileText,
  pricing: IconCoin,
  anomaly: IconShieldExclamation,
  billing: IconReceipt,
};

// ── Lyzr agent card ──────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: LyzrAgentCard }) {
  const [open, setOpen] = useState(false);
  const Icon = AGENT_ICON[agent.key] ?? IconRobot;
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{agent.name}</p>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">{agent.step}</span>
          </div>
          {agent.error ? (
            <p className="text-[11px] text-destructive mt-1">{agent.error}</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] text-muted-foreground">
                {agent.id && <span className="font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">{agent.id}</span>}
                {agent.model && <span className="font-medium">{agent.model}</span>}
                {agent.temperature != null && <span>temp {agent.temperature}</span>}
              </div>
              {agent.role && (
                <>
                  <p className={cn("text-[12px] text-muted-foreground mt-2 leading-relaxed", !open && "line-clamp-2")}>{agent.role}</p>
                  <button onClick={() => setOpen((v) => !v)} className="mt-1 text-[11px] font-medium text-primary hover:text-primary/80">
                    {open ? "Show less" : "Show system role"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── File tree ────────────────────────────────────────────────────────────────
function TreeItem({ node, depth, onSelect, selected }: { node: TreeNode; depth: number; onSelect: (p: string) => void; selected: string | null }) {
  const [open, setOpen] = useState(depth < 1);
  const pad = { paddingLeft: 8 + depth * 14 };
  if (node.type === "dir") {
    return (
      <div>
        <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-primary/[0.05] text-left" style={pad}>
          <IconChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", open && "rotate-90")} />
          {open ? <IconFolderOpen className="w-3.5 h-3.5 text-primary/70" /> : <IconFolder className="w-3.5 h-3.5 text-primary/70" />}
          <span className="text-[12px] font-medium text-foreground">{node.name}</span>
        </button>
        {open && node.children?.map((c) => <TreeItem key={c.path} node={c} depth={depth + 1} onSelect={onSelect} selected={selected} />)}
      </div>
    );
  }
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn("w-full flex items-center gap-1.5 py-1 px-2 rounded-md text-left transition-colors", selected === node.path ? "bg-primary/10 text-primary" : "hover:bg-primary/[0.05] text-muted-foreground")}
      style={{ paddingLeft: 8 + depth * 14 + 16 }}
    >
      <IconFile className={cn("w-3.5 h-3.5 shrink-0", selected === node.path ? "text-primary" : "text-muted-foreground/50")} />
      <span className="text-[12px] font-mono truncate">{node.name}</span>
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AgentConfigPage() {
  const [agents, setAgents] = useState<LyzrAgentCard[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agent/lyzr-agents").then((r) => r.json()).catch(() => ({ agents: [] })),
      fetch("/api/agent/fs").then((r) => r.json()).catch(() => ({ tree: [] })),
    ]).then(([a, f]) => {
      setAgents(a.agents ?? []);
      setTree(f.tree ?? []);
      setLoading(false);
      // Default to agent.yaml if present.
      const yaml = (f.tree ?? []).find((n: TreeNode) => n.name === "agent.yaml");
      if (yaml) loadFile(yaml.path);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFile = useCallback((p: string) => {
    setSelected(p);
    setFileLoading(true);
    fetch(`/api/agent/fs?path=${encodeURIComponent(p)}`)
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? d.error ?? ""))
      .catch(() => setContent("Could not load file."))
      .finally(() => setFileLoading(false));
  }, []);

  const isMd = selected?.endsWith(".md");

  return (
    <div className="space-y-6 px-4 sm:px-6 py-5 pb-12 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <IconRobot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Agents</p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Agent Configuration</h1>
          <p className="text-[11px] text-muted-foreground font-medium">The four Lyzr pipeline agents and the console copilot&apos;s git-native repo.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Pipeline agents */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Pipeline agents · Lyzr</h2>
            <p className="text-[11px] text-muted-foreground">The production automation. Each runs one step; the heavy math (price &amp; schedule) runs on Lyzr.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-1">
              {agents.map((a) => <AgentCard key={a.key} agent={a} />)}
            </div>
          </section>

          {/* Gitagent repo */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <IconBrandGit className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Console copilot · gitagent repo</h2>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The console agent&apos;s identity, rules, knowledge and skills are version-controlled files in <span className="font-mono">/agent</span>. This is the real file system it reads at runtime.
            </p>
            <div className="glass-card rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr] mt-1">
              {/* Tree */}
              <div className="border-b md:border-b-0 md:border-r border-black/[0.05] p-2 max-h-[520px] overflow-y-auto bg-white/20">
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <IconFolderOpen className="w-3.5 h-3.5 text-primary/70" /> agent
                </div>
                {tree.map((n) => <TreeItem key={n.path} node={n} depth={0} onSelect={loadFile} selected={selected} />)}
              </div>
              {/* Viewer */}
              <div className="min-w-0 max-h-[520px] overflow-y-auto">
                <div className="h-9 px-4 flex items-center border-b border-black/[0.05] bg-white/10">
                  <span className="text-[11px] font-mono text-muted-foreground truncate">{selected ? `agent/${selected}` : "Select a file"}</span>
                </div>
                <div className="p-5">
                  {fileLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                  ) : !selected ? (
                    <p className="text-sm text-muted-foreground">Pick a file from the tree to view it.</p>
                  ) : isMd ? (
                    <div className="prose-agent"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div>
                  ) : (
                    <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-foreground/80">{content}</pre>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
