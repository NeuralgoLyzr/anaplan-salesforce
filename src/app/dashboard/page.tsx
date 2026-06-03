"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Info, FileText, ChevronDown, Loader2, AlertTriangle, Cloud, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchBar, type RevRecAction } from "@/components/dashboard/SearchBar";
import { InsightRow } from "@/components/dashboard/InsightRow";
import { STATUS_META, isBusy, formatMoney, type SessionSummary } from "@/lib/rev-rec/ui";
import type { DashboardInsight } from "@/lib/types";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function compactMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function Dashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/companies", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCompanies(data.companies ?? []);
    } catch {
      /* keep empty — dashboard degrades gracefully */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the dashboard fresh while any contract is still being processed.
  useEffect(() => {
    if (!companies.some((c) => isBusy(c.status))) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [companies, load]);

  // ─── Derive everything from real pipeline state ──────────────────
  const derived = useMemo(() => {
    const awaitingApproval = companies.filter((c) => c.status === "gate1" || c.status === "gate2");
    const flagged = companies.filter((c) => (c.anomaly_count ?? 0) > 0);
    const complete = companies.filter((c) => c.status === "complete");
    const failed = companies.filter((c) => c.status === "failed");
    const fromSalesforce = companies.filter((c) => c.source === "salesforce");
    const recognized = complete.reduce((s, c) => s + toNumber(c.total_revenue), 0);
    const totalAnomalies = flagged.reduce((s, c) => s + (c.anomaly_count ?? 0), 0);

    // Insights — operational, revenue-recognition specific, derived from live data.
    const insights: DashboardInsight[] = [];
    if (awaitingApproval.length > 0) {
      const g1 = awaitingApproval.filter((c) => c.status === "gate1").length;
      const g2 = awaitingApproval.filter((c) => c.status === "gate2").length;
      const parts = [
        g1 ? `${g1} revenue plan${g1 === 1 ? "" : "s"}` : "",
        g2 ? `${g2} journal-entry set${g2 === 1 ? "" : "s"}` : "",
      ].filter(Boolean);
      insights.push({
        id: "approvals",
        severity: "warning",
        headline: `${awaitingApproval.length} contract${awaitingApproval.length === 1 ? "" : "s"} awaiting your sign-off`,
        summary: `${parts.join(" and ")} need a controller's approval before posting to the books.`,
        category: "approvals",
        actionLabel: "Review approvals",
        href: `/customers/${awaitingApproval[0].session_id}`,
      });
    }
    if (flagged.length > 0) {
      insights.push({
        id: "anomalies",
        severity: "critical",
        headline: `${totalAnomalies} anomal${totalAnomalies === 1 ? "y" : "ies"} flagged for review`,
        summary: `Unusual terms detected across ${flagged.length} contract${flagged.length === 1 ? "" : "s"} — recommended for senior accountant review.`,
        category: "anomaly",
        actionLabel: "Investigate",
        href: `/customers/${flagged[0].session_id}`,
      });
    }
    if (failed.length > 0) {
      insights.push({
        id: "failed",
        severity: "critical",
        headline: `${failed.length} pipeline${failed.length === 1 ? "" : "s"} need attention`,
        summary: `Processing failed and could not produce a revenue schedule. Re-run or check the source contract.`,
        category: "error",
        actionLabel: "Resolve",
        href: `/customers/${failed[0].session_id}`,
      });
    }
    if (fromSalesforce.length > 0) {
      insights.push({
        id: "salesforce",
        severity: "info",
        headline: `${fromSalesforce.length} contract${fromSalesforce.length === 1 ? "" : "s"} auto-detected from Salesforce`,
        summary: `Executed contracts were picked up automatically and run through the recognition pipeline.`,
        category: "salesforce",
        actionLabel: "View",
        href: "/",
      });
    }
    if (complete.length > 0) {
      insights.push({
        id: "recognized",
        severity: "positive",
        headline: `${complete.length} contract${complete.length === 1 ? "" : "s"} fully recognized`,
        summary: `${compactMoney(recognized)} in revenue scheduled and posted with a complete, traceable audit trail.`,
        category: "complete",
        actionLabel: "View",
        href: "/",
      });
    }

    // Suggested actions — the human-in-the-loop work queue, highest-priority first.
    const actions: RevRecAction[] = [];
    for (const c of awaitingApproval.filter((c) => c.status === "gate1")) {
      actions.push({
        company: c.company_name,
        status: c.status,
        label: "Approve revenue plan",
        detail: "Allocation & monthly schedule ready for sign-off",
        href: `/customers/${c.session_id}`,
      });
    }
    for (const c of awaitingApproval.filter((c) => c.status === "gate2")) {
      actions.push({
        company: c.company_name,
        status: c.status,
        label: "Review & post journal entries",
        detail: "Invoices and journal entries awaiting controller approval",
        href: `/customers/${c.session_id}`,
      });
    }
    for (const c of failed) {
      actions.push({
        company: c.company_name,
        status: c.status,
        label: "Resolve failed pipeline",
        detail: "Processing stopped — re-run or check the contract",
        href: `/customers/${c.session_id}`,
      });
    }
    for (const c of flagged.filter((c) => !awaitingApproval.includes(c) && c.status !== "failed")) {
      actions.push({
        company: c.company_name,
        status: c.status,
        label: "Review flagged anomalies",
        detail: `${c.anomaly_count} unusual term${c.anomaly_count === 1 ? "" : "s"} need a closer look`,
        href: `/customers/${c.session_id}`,
      });
    }

    // Active contracts — most recently updated first.
    const active = [...companies]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);

    return { insights, actions: actions.slice(0, 5), active, awaitingApproval };
  }, [companies]);

  const displayedInsights = showAllInsights ? derived.insights : derived.insights.slice(0, 3);
  const approvalCount = derived.awaitingApproval.length;

  return (
    <div className="px-4 py-5 sm:px-6 max-w-[1050px] mx-auto space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-6rem)]"
      >
        <div className="mb-5 inline-flex flex-col items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Anaplan_logo.svg.png" alt="Anaplan" className="h-10 w-auto" />
          <span className="mt-1.5 self-end flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
            powered by
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lyzr-logo.webp" alt="Lyzr" className="h-4 w-auto" />
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Revenue <span className="text-primary">Recognition</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          From signed contract to posted journal entries — priced and scheduled on Anaplan, flagged for
          anomalies, and held for your approval.
        </p>
        {!loading && approvalCount > 0 && (
          <p className="mt-3 text-[13px] font-medium text-amber-600">
            {approvalCount} contract{approvalCount === 1 ? "" : "s"} need your sign-off
          </p>
        )}
        <SearchBar
          query={query}
          onChange={setQuery}
          onSubmit={() => {
            if (query.trim()) router.push(`/console?q=${encodeURIComponent(query.trim())}`);
          }}
          suggestedActions={derived.actions}
          onActionClick={(href) => router.push(href)}
        />
      </motion.div>

      {/* Insights + Active contracts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Insights */}
        <div className="md:col-span-3 space-y-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Insights</h2>
            {derived.insights.length > 0 && (
              <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {derived.insights.length}
              </span>
            )}
          </div>
          <div className="glass-card rounded-xl p-1">
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : derived.insights.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-muted-foreground">No contracts in the pipeline yet.</p>
              </div>
            ) : (
              <>
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-0">
                  {displayedInsights.map((insight, idx) => (
                    <InsightRow key={insight.id} insight={insight} index={idx} />
                  ))}
                </motion.div>
                {!showAllInsights && derived.insights.length > 3 && (
                  <button
                    onClick={() => setShowAllInsights(true)}
                    className="w-full py-1 text-[9px] font-medium text-primary hover:text-primary/80 transition-all flex items-center justify-center gap-1"
                  >
                    Show all {derived.insights.length} insights <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Active contracts */}
        <div className="md:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <FileText className="w-3.5 h-3.5 text-primary" />
            Active Contracts
            {companies.length > 0 && (
              <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {companies.length}
              </span>
            )}
          </h2>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-1.5">
            {loading ? (
              <div className="glass-card rounded-xl py-10 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : derived.active.length === 0 ? (
              <button
                onClick={() => router.push("/")}
                className="glass-card rounded-xl w-full py-8 text-center hover:bg-white/40 transition-colors"
              >
                <p className="text-xs font-medium text-foreground/70">No contracts yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Add one to start the pipeline</p>
              </button>
            ) : (
              derived.active.map((c) => {
                const meta = STATUS_META[c.status];
                return (
                  <motion.div
                    key={c.session_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => router.push(`/customers/${c.session_id}`)}
                    className="glass-card rounded-xl p-3 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-semibold text-foreground text-xs leading-tight truncate">
                          {c.company_name}
                        </h3>
                        {c.source === "salesforce" && (
                          <Cloud className="w-3 h-3 text-blue-500/70 flex-shrink-0" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0",
                          meta.pill,
                        )}
                      >
                        {meta.busy && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <FileText className="w-2.5 h-2.5" />
                        {c.file_count}
                      </span>
                      <span className="font-mono tabular-nums text-foreground/70">{formatMoney(c.total_revenue)}</span>
                      {(c.anomaly_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {c.anomaly_count}
                        </span>
                      )}
                      <ArrowRight className="w-3 h-3 ml-auto text-primary/0 group-hover:text-primary/50 transition-colors" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
