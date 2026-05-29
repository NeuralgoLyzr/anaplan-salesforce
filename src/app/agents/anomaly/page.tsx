"use client";

import { IconShieldExclamation } from "@tabler/icons-react";
import { AgentBulkShell } from "@/components/rev-rec/AgentBulkShell";
import { AnomalyReview } from "@/components/rev-rec/AnomalyReview";
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
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-red-500/10 text-red-600 border-red-400/20">
              Action needed · {blocking} blocking
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-400/20">
            Action needed
          </span>
        );
      }}
      rowSummary={(s) => {
        const findings = getAnomalies(s).length;
        const { total, blocking } = getActionItems(s);
        return (
          <span className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {findings} finding{findings === 1 ? "" : "s"}
            </span>
            {total > 0 && (
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {total} action{total === 1 ? "" : "s"}
              </span>
            )}
            {blocking > 0 && (
              <span className="text-[10px] font-medium bg-red-500/10 text-red-600 border border-red-400/20 px-1.5 py-0.5 rounded-full">
                {blocking} blocking
              </span>
            )}
          </span>
        );
      }}
      renderSession={(s, refresh) => (
        <div className="space-y-3">
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
          <AnomalyReview session={s} />
        </div>
      )}
    />
  );
}
