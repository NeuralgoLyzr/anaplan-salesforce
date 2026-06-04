"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Info, ChevronDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchBar, type RevRecAction } from "@/components/dashboard/SearchBar";
import { InsightRow } from "@/components/dashboard/InsightRow";
import { STATUS_META, isBusy, type SessionSummary } from "@/lib/rev-rec/ui";
import type { DashboardInsight } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
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
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!companies.some((c) => isBusy(c.status))) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [companies, load]);
  const derived = useMemo(() => {
    const awaitingApproval = companies.filter((c) => c.status === "gate1" || c.status === "gate2");
    const flagged = companies.filter((c) => (c.anomaly_count ?? 0) > 0);
    const complete = companies.filter((c) => c.status === "complete");
    const failed = companies.filter((c) => c.status === "failed");
    const fromSalesforce = companies.filter((c) => c.source === "salesforce");
    const recognized = complete.reduce((s, c) => s + toNumber(c.total_revenue), 0);
    const totalAnomalies = flagged.reduce((s, c) => s + (c.anomaly_count ?? 0), 0);
    const insights: DashboardInsight[] = [];
    if (awaitingApproval.length > 0) {
      const g1 = awaitingApproval.filter((c) => c.status === "gate1").length;
      const g2 = awaitingApproval.filter((c) => c.status === "gate2").length;
      const parts = [
        g1 ? `${g1} revenue plan${g1 === 1 ? "" : "s"}` : "",
        g2 ? `${g2} journal-entry set${g2 === 1 ? "" : "s"}` : "",
      ].filter(Boolean);
      insights.push({
        id: "approvals", severity: "warning",
        headline: `${awaitingApproval.length} contract${awaitingApproval.length === 1 ? "" : "s"} awaiting your sign-off`,
        summary: `${parts.join(" and ")} need a controller's approval before posting to the books.`,
        category: "approvals", actionLabel: "Review approvals",
        href: `/customers/${awaitingApproval[0].session_id}`,
      });
    }
    if (flagged.length > 0) {
      insights.push({
        id: "anomalies", severity: "critical",
        headline: `${totalAnomalies} anomal${totalAnomalies === 1 ? "y" : "ies"} flagged for review`,
        summary: `Unusual terms detected across ${flagged.length} contract${flagged.length === 1 ? "" : "s"} — recommended for senior accountant review.`,
        category: "anomaly", actionLabel: "Investigate",
        href: `/customers/${flagged[0].session_id}`,
      });
    }
    if (failed.length > 0) {
      insights.push({
        id: "failed", severity: "critical",
        headline: `${failed.length} pipeline${failed.length === 1 ? "" : "s"} need attention`,
        summary: `Processing failed and could not produce a revenue schedule. Re-run or check the source contract.`,
        category: "error", actionLabel: "Resolve",
        href: `/customers/${failed[0].session_id}`,
      });
    }
    if (fromSalesforce.length > 0) {
      insights.push({
        id: "salesforce", severity: "info",
        headline: `${fromSalesforce.length} contract${fromSalesforce.length === 1 ? "" : "s"} auto-detected from Salesforce`,
        summary: `Executed contracts were picked up automatically and run through the recognition pipeline.`,
        category: "salesforce", actionLabel: "View", href: "/customers",
      });
    }
    if (complete.length > 0) {
      insights.push({
        id: "recognized", severity: "positive",
        headline: `${complete.length} contract${complete.length === 1 ? "" : "s"} fully recognized`,
        summary: `${compactMoney(recognized)} in revenue scheduled and posted with a complete, traceable audit trail.`,
        category: "complete", actionLabel: "View", href: "/customers",
      });
    }
    const actions: RevRecAction[] = [];
    for (const c of awaitingApproval.filter((c) => c.status === "gate1"))
      actions.push({ company: c.company_name, status: c.status, label: "Approve revenue plan", detail: "Allocation & monthly schedule ready for sign-off", href: `/customers/${c.session_id}` });
    for (const c of awaitingApproval.filter((c) => c.status === "gate2"))
      actions.push({ company: c.company_name, status: c.status, label: "Review & post journal entries", detail: "Invoices and journal entries awaiting controller approval", href: `/customers/${c.session_id}` });
    for (const c of failed)
      actions.push({ company: c.company_name, status: c.status, label: "Resolve failed pipeline", detail: "Processing stopped — re-run or check the contract", href: `/customers/${c.session_id}` });
    for (const c of flagged.filter((c) => !awaitingApproval.includes(c) && c.status !== "failed"))
      actions.push({ company: c.company_name, status: c.status, label: "Review flagged anomalies", detail: `${c.anomaly_count} unusual term${c.anomaly_count === 1 ? "" : "s"} need a closer look`, href: `/customers/${c.session_id}` });
    return { insights, actions: actions.slice(0, 6), awaitingApproval };
  }, [companies]);
  const displayedInsights = showAllInsights ? derived.insights : derived.insights.slice(0, 3);
  const approvalCount = derived.awaitingApproval.length;
  return (
    <div className="px-4 sm:px-6 pt-20 pb-16 max-w-[1050px] mx-auto space-y-10">
      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-5 inline-flex flex-col items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Anaplan_logo.svg.png" alt="Anaplan" className="h-10 w-auto" />
          <span className="mt-1.5 self-end flex items-center gap-1.5 text-[0.75rem] font-medium text-[#485478]">
            powered by
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lyzr-logo.webp" alt="Lyzr" className="h-4 w-auto" />
          </span>
        </div>
        <h1 className="text-[1.375rem] leading-[1.5] sm:text-[2.25rem] leading-[1.2] font-semibold text-[#242d48]">
          Revenue <span className="text-[#3c67ea]">Recognition</span>
        </h1>
        <p className="text-[0.875rem] leading-[1.2] text-[#485478] mt-2 max-w-xl">
          From signed contract to posted journal entries — priced and scheduled on Anaplan, flagged for
          anomalies, and held for your approval.
        </p>
        {!loading && approvalCount > 0 && (
          <p className="mt-3 text-[13px] font-medium text-[#ffbb16]">
            {approvalCount} contract{approvalCount === 1 ? "" : "s"} need your sign-off
          </p>
        )}
        <SearchBar
          query={query}
          onChange={setQuery}
          onSubmit={() => { if (query.trim()) router.push(`/console?q=${encodeURIComponent(query.trim())}`); }}
        />
        {/* Integrated systems */}
        <div className="mt-6 flex items-center justify-center gap-x-6 gap-y-2 flex-wrap">
          <span className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478]">
            Integrated systems
          </span>
          <span className="inline-flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Salesforce.com_logo.svg.png" alt="Salesforce" className="h-4 w-auto" />
            <CheckCircle2 className="w-3.5 h-3.5 text-[#14a687]" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/PLAN-82aa46a2.png" alt="Anaplan" className="h-4 w-auto" />
            <span className="text-[0.875rem] leading-[1.2] font-medium text-[#242d48]">Anaplan MCP</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#14a687]" />
          </span>
        </div>
      </motion.div>
      {/* ── Insights + Needs your attention 50/50 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insights */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#3c67ea]" />
            <h2 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">Insights</h2>
            {derived.insights.length > 0 && (
              <span className="text-[0.75rem] font-medium bg-[#f0f1f7] text-[#3c67ea] px-1.5 py-0.5 rounded-[2px]">
                {derived.insights.length}
              </span>
            )}
          </div>
          <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] p-1">
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader size="inline" />
              </div>
            ) : derived.insights.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">No contracts in the pipeline yet.</p>
              </div>
            ) : (
              <>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-0"
                >
                  {displayedInsights.map((insight, idx) => (
                    <InsightRow key={insight.id} insight={insight} index={idx} />
                  ))}
                </motion.div>
                {!showAllInsights && derived.insights.length > 3 && (
                  <button
                    onClick={() => setShowAllInsights(true)}
                    className="w-full py-1 text-[0.75rem] font-medium text-[#3c67ea] hover:text-[#3c67ea] transition-all flex items-center justify-center gap-1"
                  >
                    Show all {derived.insights.length} insights <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {/* Needs your attention */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-[#3c67ea]" />
            <h2 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">Needs your attention</h2>
            {derived.actions.length > 0 && (
              <span className="text-[0.75rem] font-medium bg-white text-[#ffbb16] px-1.5 py-0.5 rounded-[2px]">
                {derived.actions.length}
              </span>
            )}
          </div>
          <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] overflow-hidden">
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader size="inline" />
              </div>
            ) : derived.actions.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Nothing waiting on you. 🎉</p>
              </div>
            ) : (
              derived.actions.map((action, idx) => {
                const meta = STATUS_META[action.status];
                return (
                  <div
                    key={idx}
                    onClick={() => router.push(action.href)}
                    className={cn(
                      "flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#f0f1f7]] transition-colors cursor-pointer group",
                      idx !== 0 && "border-t border-[#e6ebf8]/60"
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[0.75rem] font-medium px-1.5 py-0.5 rounded-[2px] border flex-shrink-0",
                      meta.pill
                    )}>
                      {meta.busy && <Loader size="inline" />}
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.75rem] text-[#242d48] truncate">
                        {action.label} for{" "}
                        <span className="font-semibold text-[#242d48]">{action.company}</span>
                      </p>
                      <p className="text-[0.75rem] text-[#485478] truncate">{action.detail}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#3c67ea] group-hover:text-[#3c67ea] transition-colors flex-shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
