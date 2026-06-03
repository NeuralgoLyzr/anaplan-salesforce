"use client";

import { useState } from "react";
import { IconCoin } from "@tabler/icons-react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AgentBulkShell } from "@/components/rev-rec/AgentBulkShell";
import { Gate1RevenuePlan } from "@/components/rev-rec/Gate1RevenuePlan";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/rev-rec/types";
import { getReconciliation } from "@/lib/rev-rec/view";

async function postGate1(
  sessionId: string,
  section: "allocation" | "monthly",
  decision: "approve" | "reject",
  approverName: string
) {
  const res = await fetch(`/api/companies/${sessionId}/gate1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, decision, approver_name: approverName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Approval failed");
  return data.session as Session;
}

export default function PricingAgentPage() {
  return (
    <AgentBulkShell
      title="Pricing Agent"
      subtitle="Revenue allocation & monthly projection"
      icon={IconCoin}
      hasContent={(s) =>
        !!(s.agent_outputs.pricing.json || s.agent_outputs.pricing.markdown) ||
        s.status === "gate1"
      }
      // Pending = revenue plan awaiting Gate 1 approval, OR pricing still
      // running (so customer is on the way to gate1). Completed = past gate1.
      isPending={(s) => s.status === "gate1" || s.agent_outputs.pricing.status === "running"}
      emptyHint="No pricing results yet. Customers will appear once Agent 2 completes."
      toolbar={(sessions, refresh) => (
        <BulkApproveButton sessions={sessions} refresh={refresh} />
      )}
      rowPill={(s) => {
        // Only surface a pill when *this agent* needs the user to act.
        // gate1 = revenue plan awaiting approval; reconciliation-failed needs
        // attention too. Otherwise: no pill.
        const recon = getReconciliation(s);
        const reconBad = recon.allocationMatches === false || recon.monthlyMatches === false;
        if (s.status === "gate1") {
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/20">
              Action needed
            </span>
          );
        }
        if (reconBad) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-destructive/10 text-destructive border-destructive/20">
              Reconciliation failed
            </span>
          );
        }
        return null;
      }}
      renderSession={(s, refresh) => (
        <Gate1RevenuePlan
          session={s}
          actionable={s.status === "gate1"}
          onDecision={async (section, decision, approverName) => {
            await postGate1(s.session_id, section, decision, approverName);
            refresh();
          }}
        />
      )}
    />
  );
}

function BulkApproveButton({ sessions, refresh }: { sessions: Session[]; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [approver, setApprover] = useState("");

  const pending = sessions.filter((s) => {
    if (s.status !== "gate1") return false;
    const recon = getReconciliation(s);
    return !(recon.allocationMatches === false || recon.monthlyMatches === false);
  });

  async function approveAll() {
    if (pending.length === 0) return;
    setBusy(true);
    try {
      for (const s of pending) {
        const allocPending = s.gates.g1_allocation?.status !== "approved";
        const monthlyPending = s.gates.g1_monthly?.status !== "approved";
        if (allocPending) await postGate1(s.session_id, "allocation", "approve", approver.trim());
        if (monthlyPending) await postGate1(s.session_id, "monthly", "approve", approver.trim());
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="glass-input rounded-lg px-3 py-1.5 text-sm w-40"
        placeholder="Approver (optional)"
        value={approver}
        onChange={(e) => setApprover(e.target.value)}
      />
      <Button size="sm" className="gap-1.5" disabled={busy || pending.length === 0} onClick={approveAll}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Bulk approve ({pending.length})
      </Button>
    </div>
  );
}
