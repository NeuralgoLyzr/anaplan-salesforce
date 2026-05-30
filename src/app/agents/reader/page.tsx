"use client";

import { IconFileText } from "@tabler/icons-react";
import { FileText, Loader2 } from "lucide-react";
import { AgentBulkShell } from "@/components/rev-rec/AgentBulkShell";
import { MarkdownPanel } from "@/components/pipeline/MarkdownPanel";

export default function ReaderAgentPage() {
  return (
    <AgentBulkShell
      title="Reader Agent"
      subtitle="Contract intake — files, pages, and brief"
      icon={IconFileText}
      hasContent={(s) => s.uploaded_files.length > 0 || s.agent_outputs.reader.status !== "pending"}
      // Pending = the contract brief hasn't been produced yet (parsing,
      // running, retrying, or failed). Completed = reader output is in place.
      isPending={(s) => s.agent_outputs.reader.status !== "complete"}
      emptyHint="No customers have uploaded contracts yet."
      rowSummary={(s) => {
        const totalPages = s.uploaded_files.reduce((acc, f) => acc + (f.page_count ?? 0), 0);
        return (
          <span className="text-[11px] text-muted-foreground">
            {totalPages} page{totalPages === 1 ? "" : "s"}
          </span>
        );
      }}
      renderSession={(s) => {
        const reader = s.agent_outputs.reader;
        return (
          <div className="space-y-3">
            {/* Files mini-card */}
            <div className="rounded-lg border border-primary/[0.07] bg-background/40 p-3">
              <p className="text-[12px] font-semibold text-foreground/80 mb-2">Uploaded documents</p>
              {s.uploaded_files.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No files.</p>
              ) : (
                <ul className="space-y-1.5">
                  {s.uploaded_files.map((f) => (
                    <li key={f.doc_id} className="flex items-center gap-2 text-[12px]">
                      <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span className="truncate flex-1">{f.filename}</span>
                      {f.parse_status === "RUNNING" && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-sky-600">
                          <Loader2 className="w-3 h-3 animate-spin" />parsing
                        </span>
                      )}
                      {f.parser && f.parse_status !== "RUNNING" && (
                        <span className="text-[10px] text-muted-foreground/70">{f.parser}</span>
                      )}
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {f.doc_type}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {f.page_count}p · {f.language}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <MarkdownPanel
              icon={FileText}
              title="Contract brief"
              subtitle="Agent 1 · Contract Reader"
              content={reader.markdown ?? ""}
              emptyTitle={reader.status === "running" ? "Reading contracts…" : "Not available yet"}
              emptyDescription="The contract brief will appear once Agent 1 completes."
              isLoading={reader.status === "running"}
            />
          </div>
        );
      }}
    />
  );
}
