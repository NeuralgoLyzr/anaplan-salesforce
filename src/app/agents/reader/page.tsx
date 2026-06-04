"use client";
import { IconFileText } from "@tabler/icons-react";
import { FileText } from "lucide-react";
import { AgentBulkShell } from "@/components/rev-rec/AgentBulkShell";
import { MarkdownPanel } from "@/components/pipeline/MarkdownPanel";
import { Loader } from "@/components/ui/loader";
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
          <span className="text-[0.75rem] text-[#485478]">
            {totalPages} page{totalPages === 1 ? "" : "s"}
          </span>
        );
      }}
      renderSession={(s) => {
        const reader = s.agent_outputs.reader;
        return (
          <div className="space-y-3">
            {/* Files mini-card */}
            <div className="rounded-[4px] border border-[#e6ebf8] bg-white p-3">
              <p className="text-[0.75rem] font-semibold text-[#242d48] mb-2">Uploaded documents</p>
              {s.uploaded_files.length === 0 ? (
                <p className="text-[0.75rem] text-[#485478]">No files.</p>
              ) : (
                <ul className="space-y-1.5">
                  {s.uploaded_files.map((f) => (
                    <li key={f.doc_id} className="flex items-center gap-2 text-[0.75rem]">
                      <FileText className="w-3.5 h-3.5 text-[#3c67ea] shrink-0" />
                      <span className="truncate flex-1">{f.filename}</span>
                      {f.parse_status === "RUNNING" && (
                        <span className="inline-flex items-center gap-1 text-[0.75rem] text-[#3c67ea]">
                          <Loader size="inline" />parsing
                        </span>
                      )}
                      {f.parser && f.parse_status !== "RUNNING" && (
                        <span className="text-[0.75rem] text-[#485478]">{f.parser}</span>
                      )}
                      <span className="text-[0.75rem] font-medium px-1.5 py-0.5 rounded-[2px] bg-[#f0f1f7] text-[#3c67ea]">
                        {f.doc_type}
                      </span>
                      <span className="text-[0.75rem] text-[#485478]">
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
