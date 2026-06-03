"use client";

import { useState } from "react";
import {
  Table2, CalendarRange, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import type { Session, GateDecision } from "@/lib/rev-rec/types";
import {
  getHeaderSummary, getAllocation, getRevenueByMonth, getReconciliation,
} from "@/lib/rev-rec/view";
import { SimpleTable } from "./SimpleTable";
import { MonthlyProjectionChart } from "./MonthlyProjectionChart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GateSection = "allocation" | "monthly";

interface Props {
  session: Session;
  // When false, approval forms are hidden and decision banners are shown.
  actionable: boolean;
  // Each ApprovalBar awaits this to drive its own local loader — so clicking
  // Allocation's Approve only spins Allocation, not Monthly projection.
  onDecision: (section: GateSection, decision: "approve" | "reject", approverName: string) => Promise<void> | void;
}

export function Gate1RevenuePlan({ session, actionable, onDecision }: Props) {
  const header = getHeaderSummary(session);
  const allocation = getAllocation(session);
  const monthStack = getRevenueByMonth(session);
  const recon = getReconciliation(session);

  // Anomalies are informational — they never block the approval. The only hard
  // gate is reconciliation (a math invariant the Billing agent itself requires).
  const reconBad = recon.allocationMatches === false || recon.monthlyMatches === false;
  const disabledReason = reconBad
    ? "Pricing reconciliation failed — billing can't run until totals reconcile."
    : null;

  // Per-section gates (fall back to the overall gate for sessions created before
  // the split, so their banners still render correctly).
  const overall = session.gates.g1_revenue_plan;
  const allocGate = (session.gates.g1_allocation as GateDecision | undefined) ?? overall;
  const monthlyGate = (session.gates.g1_monthly as GateDecision | undefined) ?? overall;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <SummaryItem label="Customer" value={header.company} strong />
          {header.contractRef && <SummaryItem label="Contract" value={header.contractRef} />}
          {header.totalValue && <SummaryItem label="Total contract value" value={`${header.currency ?? ""} ${header.totalValue}`.trim()} />}
          {header.period && <SummaryItem label="Period" value={header.period} />}
        </div>
      </div>

      {/* Allocation — full width, with its own approval */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <SectionTitle icon={Table2} title="Allocation" subtitle="SSP revenue allocation" />
        <SimpleTable view={allocation} emptyLabel="No allocation returned by Pricing." />
        <ApprovalBar
          label="allocation"
          gate={allocGate}
          actionable={actionable}
          disabled={reconBad}
          disabledReason={disabledReason}
          onDecision={(decision, name) => onDecision("allocation", decision, name)}
        />
      </div>

      {/* Monthly projection — with its own approval */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <SectionTitle icon={CalendarRange} title="Monthly projection" subtitle="Recognized revenue by month, split by product" />
        <MonthlyProjectionChart data={monthStack.data} products={monthStack.products} currency={header.currency} />
        <ApprovalBar
          label="monthly projection"
          gate={monthlyGate}
          actionable={actionable}
          disabled={reconBad}
          disabledReason={disabledReason}
          onDecision={(decision, name) => onDecision("monthly", decision, name)}
        />
      </div>

      {/* Reconciliation */}
      {(recon.allocationMatches != null || recon.monthlyMatches != null) && (
        <div className="flex flex-wrap gap-2">
          <ReconBadge label="Allocation reconciles" ok={recon.allocationMatches} />
          <ReconBadge label="Monthly reconciles" ok={recon.monthlyMatches} />
        </div>
      )}

      {actionable && (
        <p className="text-[11px] text-muted-foreground px-1">
          Both Allocation and Monthly projection must be approved before billing &amp; journal entries are generated.
        </p>
      )}
    </div>
  );
}

function ApprovalBar({
  label, gate, actionable, disabled, disabledReason, onDecision,
}: {
  label: string;
  gate: GateDecision;
  actionable: boolean;
  disabled: boolean;
  disabledReason: string | null;
  onDecision: (decision: "approve" | "reject", approverName: string) => Promise<void> | void;
}) {
  const [approver, setApprover] = useState("");
  // Local loading state — each ApprovalBar tracks its OWN in-flight click so
  // clicking Allocation's Approve never spins Monthly projection's button.
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    try { await onDecision(decision, approver.trim()); }
    finally { setBusy(false); }
  }

  // Decided → show a compact banner.
  if (gate.status === "approved" || gate.status === "rejected") {
    const approved = gate.status === "approved";
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px]",
          approved ? "bg-success/[0.06] border-success/20 text-success" : "bg-destructive/[0.06] border-destructive/20 text-destructive"
        )}
      >
        {approved ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
        <span className="font-medium capitalize">{label} {approved ? "approved" : "rejected"}</span>
        {gate.approver_name && <span className="text-muted-foreground">by {gate.approver_name}</span>}
      </div>
    );
  }

  // Pending but not actionable (shouldn't normally happen at this gate).
  if (!actionable) return null;

  return (
    <div className="border-t border-primary/[0.07] pt-3 flex flex-wrap items-center gap-2 justify-end">
      {disabled && disabledReason && (
        <p className="text-[12px] text-destructive mr-auto">{disabledReason}</p>
      )}
      <input
        className="glass-input rounded-lg px-3 py-1.5 text-sm w-full sm:w-48"
        placeholder="Approver (optional)"
        value={approver}
        onChange={(e) => setApprover(e.target.value)}
      />
      <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => decide("reject")}>
        <XCircle className="w-3.5 h-3.5" /> Reject
      </Button>
      <Button size="sm" className="gap-1.5" disabled={busy || disabled} onClick={() => decide("approve")}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Approve
      </Button>
    </div>
  );
}

function SummaryItem({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm", strong ? "font-semibold text-foreground" : "text-foreground/80")}>{value}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function ReconBadge({ label, ok }: { label: string; ok: boolean | null }) {
  if (ok == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border",
        ok ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
      )}
    >
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}
