"use client";

import { IconShieldExclamation } from "@tabler/icons-react";
import { AgentBulkShell } from "@/components/rev-rec/AgentBulkShell";
import { RecommendedActions } from "@/components/rev-rec/RecommendedActions";
import type { Session } from "@/lib/rev-rec/types";
import { getActionItems, getAnomalies } from "@/lib/rev-rec/view";

async function postAction(
  sessionId: string,
  actionId: string,
  decision: "accept" | "reject" | "complete",
): Promise<Session> {
  const res = await fetch(`/api/companies/${sessionId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_id: actionId, decision }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Action failed");
  return data.session as Session;
}

async function postDocumentUpload(
  sessionId: string,
  actionId: string,
  file: File,
  params: { operation: "add" | "update"; sourceDocId: string | null; triggersRerun: boolean },
): Promise<{ session: Session; upload_summary?: unknown }> {
  const form = new FormData();
  form.append("file", file);
  form.append("action_id", actionId);
  form.append("operation", params.operation);
  if (params.sourceDocId) form.append("source_doc_id", params.sourceDocId);
  form.append("triggers_rerun", String(params.triggersRerun));
  const res = await fetch(`/api/companies/${sessionId}/document-upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Document upload failed");
  return data as { session: Session; upload_summary?: unknown };
}

async function postSendEmail(
  sessionId: string,
  actionId: string,
  payload: { to: string; subject: string; body: string },
): Promise<Session> {
  const res = await fetch(`/api/companies/${sessionId}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_id: actionId, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Email send failed");
  return data.session as Session;
}

export default function AnomalyAgentPage() {
  return (
    <AgentBulkShell
      title="Anomaly Agent"
      subtitle="Findings & recommended actions"
      icon={IconShieldExclamation}
      hasContent={(s) => s.agent_outputs.anomaly.status !== "pending"}
      // Pending = at least one recommended action item still awaiting a
      // decision (not accepted, completed, or rejected). Completed = every
      // action item has been actioned (or there were none to begin with).
      isPending={(s) => {
        const { categories } = getActionItems(s);
        return categories.some((c) => c.items.some((it) => it.status === "pending"));
      }}
      emptyHint="No anomaly findings yet."
      rowPill={(s) => {
        // Pending = at least one action item the user hasn't accepted or dismissed.
        const { categories, blocking } = getActionItems(s);
        const pending = categories.reduce(
          (acc, c) => acc + c.items.filter((i) => i.status === "pending").length,
          0,
        );
        if (pending === 0) return null;
        if (blocking > 0) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-2 py-0.5 rounded-[2px] border bg-white text-[#db3743] border-[#db3743]">
              Action needed · {blocking} blocking
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-2 py-0.5 rounded-[2px] border bg-white text-[#ffbb16] border-[#ffbb16]">
            Action needed
          </span>
        );
      }}
      rowSummary={(s) => {
        const findings = getAnomalies(s).length;
        const { total, blocking } = getActionItems(s);
        return (
          <span className="flex items-center gap-2">
            <span className="text-[0.75rem] text-[#485478]">
              {findings} finding{findings === 1 ? "" : "s"}
            </span>
            {total > 0 && (
              <span className="text-[0.75rem] font-medium bg-[#f0f1f7] text-[#3c67ea] px-1.5 py-0.5 rounded-[2px]">
                {total} action{total === 1 ? "" : "s"}
              </span>
            )}
            {blocking > 0 && (
              <span className="text-[0.75rem] font-medium bg-white text-[#db3743] border border-[#db3743] px-1.5 py-0.5 rounded-[2px]">
                {blocking} blocking
              </span>
            )}
          </span>
        );
      }}
      renderSession={(s, refresh) => (
        <RecommendedActions
          session={s}
          handlers={{
            decide: async (actionId, decision) => {
              await postAction(s.session_id, actionId, decision);
              refresh();
            },
            uploadDocument: async (actionId, file, params) => {
              const r = await postDocumentUpload(s.session_id, actionId, file, params);
              refresh();
              return r.upload_summary as
                | {
                    filename: string;
                    doc_id: string;
                    operation: "add" | "update";
                    pushed_to_salesforce: boolean;
                    triggers_rerun: boolean;
                    total_files: number;
                  }
                | undefined;
            },
            sendEmail: async (actionId, payload) => {
              await postSendEmail(s.session_id, actionId, payload);
              refresh();
            },
          }}
        />
      )}
    />
  );
}
