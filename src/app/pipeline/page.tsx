"use client";

import { useState } from "react";
import {
  GitBranch, RefreshCw, Clock, Ban, CheckCircle, CheckCircle2,
  ListChecks, Loader2, XCircle, AlertTriangle, AlertCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  subject: string;
  priority: "Highest" | "High" | "Medium" | "Low" | "Lowest";
  status: string;
  assignee: string;
  subtasksDone: number;
  subtasksTotal: number;
  updatedAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const COLUMN_ORDER = ["In Progress", "Cancelled", "Under Review", "Rejected", "Approved", "Done"];

const COLUMN_STYLE: Record<string, {
  bg: string; border: string; badge: string; dot: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  "In Progress":  { bg: "bg-sky-50",     border: "border-sky-200",     badge: "bg-sky-100 text-sky-700",      dot: "bg-sky-500",     icon: Loader2       },
  "Cancelled":    { bg: "bg-orange-50",   border: "border-orange-200",  badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500",  icon: XCircle       },
  "Under Review": { bg: "bg-blue-50",     border: "border-blue-200",    badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-500",    icon: Clock         },
  "Rejected":     { bg: "bg-red-50",      border: "border-red-200",     badge: "bg-red-100 text-red-700",      dot: "bg-red-500",     icon: AlertTriangle },
  "Approved":     { bg: "bg-amber-50",    border: "border-amber-200",   badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500",   icon: CheckCircle   },
  "Done":         { bg: "bg-green-50",    border: "border-green-200",   badge: "bg-green-100 text-green-700",  dot: "bg-green-500",   icon: CheckCircle   },
};

// Solid-fill transition buttons — exact EmailSense AI style
const JIRA_NEXT_STEPS: Record<string, { label: string; status: string; color: string }[]> = {
  "In Progress":  [
    { label: "Cancel", status: "Cancelled",    color: "bg-orange-500 hover:bg-orange-600 text-white" },
    { label: "Review", status: "Under Review", color: "bg-blue-600 hover:bg-blue-700 text-white"    },
  ],
  "Under Review": [
    { label: "Reject",  status: "Rejected", color: "bg-red-600 hover:bg-red-700 text-white"    },
    { label: "Approve", status: "Approved", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  ],
  "Approved":  [{ label: "Done",   status: "Done",        color: "bg-green-600 hover:bg-green-700 text-white" }],
  "Rejected":  [{ label: "Reopen", status: "In Progress", color: "bg-sky-600 hover:bg-sky-700 text-white"    }],
  "Cancelled": [{ label: "Reopen", status: "In Progress", color: "bg-sky-600 hover:bg-sky-700 text-white"    }],
};

const PRIORITY_COLOR: Record<string, string> = {
  Highest: "text-red-600",
  High:    "text-orange-500",
  Medium:  "text-amber-500",
  Low:     "text-blue-400",
  Lowest:  "text-slate-400",
};

// ── Sample data ───────────────────────────────────────────────────────────────

const INITIAL_ISSUES: JiraIssue[] = [
  { id: "1",  key: "EMAIL-80", summary: "OAuth 2.0 authentication flow",               subject: "Auth token refresh failing on logout",     priority: "Highest", status: "In Progress",  assignee: "AM", subtasksDone: 3,  subtasksTotal: 8,  updatedAt: "May 21" },
  { id: "2",  key: "EMAIL-81", summary: "REST API endpoints for user module",          subject: "User profile update endpoint 500 error",   priority: "High",    status: "In Progress",  assignee: "DT", subtasksDone: 1,  subtasksTotal: 5,  updatedAt: "May 20" },
  { id: "3",  key: "EMAIL-82", summary: "Jira webhook for real-time sync",             subject: "Webhook signature validation mismatch",    priority: "High",    status: "Under Review", assignee: "SK", subtasksDone: 6,  subtasksTotal: 6,  updatedAt: "May 22" },
  { id: "4",  key: "EMAIL-83", summary: "CI/CD pipeline with GitHub Actions",          subject: "Pipeline deploy fails on Node 20",         priority: "Medium",  status: "Done",         assignee: "DO", subtasksDone: 4,  subtasksTotal: 4,  updatedAt: "May 10" },
  { id: "5",  key: "EMAIL-84", summary: "Unit tests for authentication service",       subject: "Test coverage below 70% threshold",        priority: "Medium",  status: "In Progress",  assignee: "QA", subtasksDone: 2,  subtasksTotal: 9,  updatedAt: "May 19" },
  { id: "6",  key: "EMAIL-85", summary: "N+1 query in engagement list endpoint",      subject: "Latency spike: 3200ms avg on /engagements", priority: "Highest", status: "Rejected",     assignee: "AM", subtasksDone: 0,  subtasksTotal: 3,  updatedAt: "May 18" },
  { id: "7",  key: "EMAIL-86", summary: "Onboarding documentation for API consumers", subject: "Missing OpenAPI spec for v2 endpoints",    priority: "Low",     status: "Cancelled",    assignee: "SK", subtasksDone: 1,  subtasksTotal: 4,  updatedAt: "May 15" },
  { id: "8",  key: "EMAIL-87", summary: "Accessibility audit on dashboard",           subject: "Screen reader skips chart labels",          priority: "Medium",  status: "Under Review", assignee: "UI", subtasksDone: 3,  subtasksTotal: 7,  updatedAt: "May 21" },
  { id: "9",  key: "EMAIL-88", summary: "Redis cache layer for OAuth rate limiting",  subject: "Rate limit exceeded: 103 req/s on peak",   priority: "High",    status: "Approved",     assignee: "AM", subtasksDone: 5,  subtasksTotal: 6,  updatedAt: "May 22" },
  { id: "10", key: "EMAIL-89", summary: "Dark mode for settings page",                subject: "Theme toggle resets on page refresh",      priority: "Low",     status: "Done",         assignee: "UI", subtasksDone: 2,  subtasksTotal: 2,  updatedAt: "May 12" },
  { id: "11", key: "EMAIL-90", summary: "E2E tests for sign-in flow via Playwright",  subject: "Flaky test: login redirect timing issue",  priority: "Medium",  status: "In Progress",  assignee: "QA", subtasksDone: 0,  subtasksTotal: 5,  updatedAt: "May 20" },
  { id: "12", key: "EMAIL-91", summary: "Datadog APM latency alerts configuration",  subject: "Alert threshold too sensitive, false pages", priority: "Low",    status: "Approved",     assignee: "DO", subtasksDone: 3,  subtasksTotal: 3,  updatedAt: "May 22" },
  { id: "13", key: "EMAIL-92", summary: "Cross-browser testing Chrome/Firefox/Safari", subject: "Safari: date picker component broken",   priority: "High",    status: "Under Review", assignee: "QA", subtasksDone: 4,  subtasksTotal: 8,  updatedAt: "May 21" },
];

// ── Issue Card (EmailSense AI style) ──────────────────────────────────────────

function IssueCard({
  issue,
  onTransition,
}: {
  issue: JiraIssue;
  onTransition: (id: string, status: string) => void;
}) {
  const steps = JIRA_NEXT_STEPS[issue.status] ?? [];
  const priorityColor = PRIORITY_COLOR[issue.priority] ?? "text-slate-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.10)" }}
      className="bg-card rounded-lg border border-border p-3 transition-all cursor-default"
    >
      {/* Summary */}
      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
        {issue.summary}
      </p>

      {/* Subject */}
      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
        {issue.subject}
      </p>

      {/* Meta row: key + priority + subtasks + avatar */}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 uppercase tracking-wider font-mono">
            {issue.key}
          </span>
          <AlertCircle className={cn("w-3 h-3 flex-shrink-0", priorityColor)} />
          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground font-semibold">
            <ListChecks className="w-3 h-3" />
            {issue.subtasksDone}/{issue.subtasksTotal}
          </span>
        </div>
        <div
          className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
          title={issue.assignee}
        >
          <span className="text-[8px] font-black text-primary-foreground uppercase">
            {issue.assignee}
          </span>
        </div>
      </div>

      {/* Updated date */}
      <p className="text-[9px] text-muted-foreground font-medium mt-1.5">
        Updated {issue.updatedAt}
      </p>

      {/* Transition buttons — solid fill, exact EmailSense AI style */}
      {steps.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 flex-wrap">
          {steps.map(step => (
            <button
              key={step.status}
              onClick={() => onTransition(issue.id, step.status)}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all",
                step.color
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Board Column ──────────────────────────────────────────────────────────────

function BoardColumn({
  name,
  issues,
  onTransition,
}: {
  name: string;
  issues: JiraIssue[];
  onTransition: (id: string, status: string) => void;
}) {
  const style = COLUMN_STYLE[name] ?? {
    bg: "bg-slate-50", border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400", icon: AlertCircle,
  };

  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      {/* Column header */}
      <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg border mb-2", style.bg, style.border)}>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", style.dot)} />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
            {name}
          </span>
        </div>
        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", style.badge)}>
          {issues.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1 min-h-[120px]">
        <AnimatePresence>
          {issues.length === 0 ? (
            <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border py-8">
              <span className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                No issues
              </span>
            </div>
          ) : (
            issues.map(issue => (
              <IssueCard key={issue.id} issue={issue} onTransition={onTransition} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [issues, setIssues] = useState<JiraIssue[]>(INITIAL_ISSUES);

  const counts = {
    inProgress:  issues.filter(i => i.status === "In Progress").length,
    cancelled:   issues.filter(i => i.status === "Cancelled").length,
    underReview: issues.filter(i => i.status === "Under Review").length,
    rejected:    issues.filter(i => i.status === "Rejected").length,
    approved:    issues.filter(i => i.status === "Approved").length,
    done:        issues.filter(i => i.status === "Done").length,
  };
  const total = issues.length;
  const passRate = total > 0 ? Math.round((counts.done / total) * 100) : 0;

  function transition(id: string, newStatus: string) {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
  }

  const donutData = [
    { name: "In Progress",  value: counts.inProgress,  color: "#0ea5e9" },
    { name: "Cancelled",    value: counts.cancelled,   color: "#f97316" },
    { name: "Under Review", value: counts.underReview, color: "#3b82f6" },
    { name: "Rejected",     value: counts.rejected,    color: "#ef4444" },
    { name: "Approved",     value: counts.approved,    color: "#f59e0b" },
    { name: "Done",         value: counts.done,        color: "#22c55e" },
  ].filter(d => d.value > 0);

  const summaryCards = [
    { label: "Under Review", value: counts.underReview, sub: "Awaiting decision",           Icon: Clock,         color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
    { label: "Rejected",     value: counts.rejected,    sub: "Blocked issues",               Icon: Ban,           color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100"    },
    { label: "Approved",     value: counts.approved,    sub: "Ready to send",                Icon: CheckCircle,   color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
    { label: "Pass Rate",    value: `${passRate}%`,     sub: `${counts.done} of ${total} done`, Icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50",  border: "border-green-100"  },
  ];

  return (
    <div className="space-y-4 pb-10 px-4 sm:px-6 py-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Pipeline</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[11px] text-muted-foreground font-medium">
                Live · Project: JIRA · {total} issues
              </p>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all">
          <RefreshCw className="w-3 h-3" />
          Sync All
        </button>
      </div>

      {/* ── KPI Cards + Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 4 compact KPI cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {summaryCards.map((card, idx) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="glass-card rounded-xl p-3 flex items-center gap-3"
            >
              <div className={cn("p-2 rounded-lg shrink-0", card.bg)}>
                <card.Icon className={cn("w-4 h-4", card.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                  {card.label}
                </p>
                <p className={cn("text-xl font-bold tracking-tight leading-tight", card.color)}>
                  {card.value}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Status donut — taller chart, compact legend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card rounded-xl p-3 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Status Distribution</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="70%"
                  dataKey="value"
                  paddingAngle={3}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 10px 30px -5px rgba(0,0,0,0.12)",
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {donutData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-muted-foreground uppercase tracking-widest">{d.name}</span>
                </div>
                <span className="font-bold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Kanban Board ──
          Pattern from EmailSense AI: flex + overflow-x-auto directly on the board.
          Columns use min-w + flex-1 — no min-w-max wrapper needed.
          SidebarLayout height: 100svh + overflow: hidden ensures this never
          causes page-level scroll. Only THIS div scrolls horizontally.
      */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ minHeight: "60vh" }}
      >
        {COLUMN_ORDER.map(col => (
          <BoardColumn
            key={col}
            name={col}
            issues={issues.filter(i => i.status === col)}
            onTransition={transition}
          />
        ))}
      </motion.div>

      {/* Live badge */}
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          Live data from Jira Cloud · Synced with project pipeline
        </p>
      </div>

    </div>
  );
}
