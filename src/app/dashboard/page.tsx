"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Info, Briefcase, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { EngagementCard } from "@/components/dashboard/EngagementCard";
import { InsightRow } from "@/components/dashboard/InsightRow";
import { SearchBar } from "@/components/dashboard/SearchBar";
import Logo from "@/components/logo/Logo";
import type { DashboardInsight, EngagementData, SuggestedAction } from "@/lib/types";


const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const INSIGHTS: DashboardInsight[] = [
  { id: "i1", severity: "critical", headline: "HDHP Adoption Lagging", summary: "Only 28% of Meridian employees enrolled in HDHP vs 45% industry benchmark.", category: "benefits", actionLabel: "Review Policy" },
  { id: "i2", severity: "warning", headline: "401k Match Below Market", summary: "TechCorp 3% match is below the 4.5% tech sector median — retention risk.", category: "retirement", actionLabel: "Benchmark Now" },
  { id: "i3", severity: "positive", headline: "Pacific Dental Coverage Strong", summary: "Pacific Foods dental plan ranks in top quartile for food & beverage peers.", category: "dental" },
  { id: "i4", severity: "info", headline: "Parental Leave Trend Emerging", summary: "Cross-industry data shows 18-week paid leave becoming standard for tech roles.", category: "leave", actionLabel: "Investigate" },
];

const ENGAGEMENTS: EngagementData[] = [
  { id: "e1", client: "Meridian Manufacturing", type: "Total Rewards Review", progress: { survey: true, policy: true, competitive: false, synthesis: false }, lastActivity: "2 hours ago", industry: "Manufacturing" },
  { id: "e2", client: "TechCorp Solutions", type: "Health Benefits", progress: { survey: true, policy: true, competitive: true, synthesis: false }, lastActivity: "Yesterday", industry: "Technology" },
  { id: "e3", client: "Pacific Foods Inc.", type: "Workers Compensation", progress: { survey: true, policy: false, competitive: false, synthesis: false }, lastActivity: "3 days ago", industry: "Food & Beverage" },
];

const SUGGESTED_ACTIONS: SuggestedAction[] = [
  { client: "Meridian Manufacturing", label: "Run competitive benchmarking", detail: "Benchmark against 5 manufacturing peers", href: "/console" },
  { client: "TechCorp Solutions", label: "Synthesize recommendation report", detail: "All journeys complete — generate final synthesis", href: "/console" },
  { client: "Pacific Foods Inc.", label: "Analyze current benefit policies", detail: "Assess policy compliance & coverage gaps", href: "/console" },
  { client: "Meridian Manufacturing", label: "Redesign employee benefits survey", detail: "Update with latest HDHP & mental health modules", href: "/console" },
  { client: "TechCorp Solutions", label: "Re-benchmark tech sector competitors", detail: "Q2 market shifts — refresh competitive positioning", href: "/console" },
];

export default function Dashboard() {
  const router = useRouter();
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [query, setQuery] = useState("");

  const displayed = showAllInsights ? INSIGHTS : INSIGHTS.slice(0, 3);

  return (
    <div className="px-4 py-5 sm:px-6 max-w-[1050px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-6rem)]">
        <div className="mb-4 flex items-center gap-2.5">
          <Logo size={36} />
          <span className="text-2xl font-semibold text-foreground">lyzr</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Welcome, <span className="text-primary">Consultant</span></h1>
        <p className="text-sm text-muted-foreground mt-2">Total Rewards Advisory AgenticOS — Intelligent consulting intelligence</p>
        <SearchBar query={query} onChange={setQuery} onSubmit={() => { if (query.trim()) router.push(`/console?q=${encodeURIComponent(query.trim())}`); }} suggestedActions={SUGGESTED_ACTIONS} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-3 space-y-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Market Insights</h2>
            <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{INSIGHTS.length}</span>
          </div>
          <div className="glass-card rounded-xl p-1">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-0">
              {displayed.map((insight, idx) => <InsightRow key={insight.id} insight={insight} index={idx} />)}
            </motion.div>
            {!showAllInsights && INSIGHTS.length > 3 && (
              <button onClick={() => setShowAllInsights(true)} className="w-full py-1 text-[9px] font-medium text-primary hover:text-primary/80 transition-all flex items-center justify-center gap-1">
                Show all {INSIGHTS.length} insights <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            Active Engagements
            <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{ENGAGEMENTS.length}</span>
          </h2>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-1.5">
            {ENGAGEMENTS.map((e) => <EngagementCard key={e.id} engagement={e} onClick={() => router.push("/console")} />)}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
