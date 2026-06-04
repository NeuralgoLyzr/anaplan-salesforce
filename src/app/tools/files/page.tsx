"use client";

import { useState } from "react";
import { FolderOpen, FileText, Database, GitBranch, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  type: "file" | "folder";
  size?: string;
  children?: FileNode[];
}

const FILE_TREE: FileNode[] = [
  {
    name: "identity/",
    type: "folder",
    children: [
      { name: "SOUL.md", type: "file", size: "2.1 KB" },
      { name: "RULES.md", type: "file", size: "3.4 KB" },
      { name: "PERSONA.md", type: "file", size: "1.8 KB" },
    ],
  },
  {
    name: "skills/",
    type: "folder",
    children: [
      { name: "survey-designer.md", type: "file", size: "4.2 KB" },
      { name: "policy-analyzer.md", type: "file", size: "3.9 KB" },
      { name: "competitive-benchmarker.md", type: "file", size: "3.5 KB" },
      { name: "synthesis-recommender.md", type: "file", size: "5.1 KB" },
    ],
  },
  {
    name: "knowledge/docs/",
    type: "folder",
    children: [
      { name: "wtw-overview.md", type: "file", size: "6.8 KB" },
      { name: "industry-benchmarks.md", type: "file", size: "12.3 KB" },
      { name: "methodology-discovery.md", type: "file", size: "4.1 KB" },
      { name: "methodology-design.md", type: "file", size: "3.7 KB" },
      { name: "methodology-implementation.md", type: "file", size: "3.2 KB" },
      { name: "methodology-measurement.md", type: "file", size: "2.9 KB" },
      { name: "sample-policy.md", type: "file", size: "8.4 KB" },
    ],
  },
  {
    name: "workspace/meridian-manufacturing/",
    type: "folder",
    children: [
      { name: "engagement-brief.md", type: "file", size: "2.8 KB" },
      { name: "policy-assessment.md", type: "file", size: "7.2 KB" },
      { name: "employee-survey.md", type: "file", size: "5.6 KB" },
    ],
  },
];

const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "identity/": Database,
  "skills/": GitBranch,
  "knowledge/docs/": Database,
};

function FileRow({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  const FolderIcon = FOLDER_ICONS[node.name] ?? FolderOpen;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-[4px] hover:bg-[#f0f1f7] transition-colors text-left"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5 text-[#485478] flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#485478] flex-shrink-0" />}
          <FolderIcon className="w-3.5 h-3.5 text-[#3c67ea] flex-shrink-0" />
          <span className="text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#242d48] font-mono">{node.name}</span>
          {node.children && (
            <span className="text-[0.75rem] text-[#485478] ml-auto">{node.children.length} files</span>
          )}
        </button>
        {open && node.children?.map((child) => (
          <FileRow key={child.name} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] hover:bg-[#f0f1f7] transition-colors cursor-default"
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      <div className="w-3.5 flex-shrink-0" />
      <FileText className="w-3.5 h-3.5 text-[#485478] flex-shrink-0" />
      <span className={cn("text-[0.75rem] uppercase tracking-[0.08em] font-mono text-[#485478] flex-1")}>{node.name}</span>
      {node.size && <span className="text-[0.75rem] text-[#485478] font-mono flex-shrink-0">{node.size}</span>}
    </div>
  );
}

export default function FileSystem() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <FolderOpen className="w-6 h-6 text-[#3c67ea]" />
          <h1 className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48]">File System</h1>
        </div>
        <p className="text-[0.875rem] leading-[1.2] text-[#485478]">
          Agent workspace — identity files, skills, knowledge base, and per-client engagement files
        </p>
      </div>

      <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] p-2">
        {FILE_TREE.map((node) => (
          <FileRow key={node.name} node={node} />
        ))}
      </div>
    </div>
  );
}
