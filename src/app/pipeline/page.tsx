"use client";
import { useState } from "react";
import { GitBranch, RefreshCw, Clock, Ban, CheckCircle, CheckCircle2, ListChecks, XCircle, AlertTriangle, AlertCircle,  } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
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
  "In Progress":  { bg: "bg-[#f0f1f7]",     border: "border-[#e6ebf8]",     badge: "bg-[#f0f1f7] text-[#3c67ea]",      dot: "bg-[#3c67ea]",     icon: Loader       },
  "Cancelled":    { bg: "bg-white",   border: "border-[#ffbb16]",  badge: "bg-white text-[#ffbb16]", dot: "bg-[#ffbb16]",  icon: XCircle       },
  "Under Review": { bg: "bg-[#f0f1f7]",     border: "border-[#e6ebf8]",    badge: "bg-[#f0f1f7] text-[#3c67ea]",    dot: "bg-[#3c67ea]",    icon: Clock         },
  "Rejected":     { bg: "bg-white",      border: "border-[#db3743]",     badge: "bg-white text-[#db3743]",      dot: "bg-[#db3743]",     icon: AlertTriangle },
  "Approved":     { bg: "bg-white",    border: "border-[#ffbb16]",   badge: "bg-white text-[#ffbb16]",  dot: "bg-[#ffbb16]",   icon: CheckCircle   },
  "Done":         { bg: "bg-white",    border: "border-[#14a687]",   badge: "bg-white text-[#14a687]",  dot: "bg-[#14a687]",   icon: CheckCircle   },
};
// Solid-fill transition buttons — exact EmailSense AI style
const JIRA_NEXT_STEPS: Record<string, { label: string; status: string; color: string }[]> = {
  "In Progress":  [
    { label: "Cancel", status: "Cancelled",    color: "bg-[#ffbb16] hover:bg-[#ffbb16] text-white" },
    { label: "Review", status: "Under Review", color: "bg-[#3c67ea] hover:bg-[#3c67ea] text-white"    },
  ],
  "Under Review": [
    { label: "Reject",  status: "Rejected", color: "bg-[#db3743] hover:bg-[#db3743] text-white"    },
    { label: "Approve", status: "Approved", color: "bg-[#ffbb16] hover:bg-[#ffbb16] text-white" },
  ],
  "Approved":  [{ label: "Done",   status: "Done",        color: "bg-[#14a687] hover:bg-[#14a687] text-white" }],
  "Rejected":  [{ label: "Reopen", status: "In Progress", color: "bg-[#3c67ea] hover:bg-[#3c67ea] text-white"    }],
  "Cancelled": [{ label: "Reopen", status: "In Progress", color: "bg-[#3c67ea] hover:bg-[#3c67ea] text-white"    }],
};
const PRIORITY_COLOR: Record<string, string> = {
  Highest: "text-[#db3743]",
  High:    "text-[#ffbb16]",
  Medium:  "text-[#ffbb16]",
  Low:     "text-[#3c67ea]",
  Lowest:  "text-[#909cc0]",
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
  const priorityColor = PRIORITY_COLOR[issue.priority] ?? "text-[#909cc0]";
  return (
    // ADS Card: 4px radius, white bg, #E6EBF8 border, L1 shadow
    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-3 cursor-default">
      {/* ADS: pear 14px/600 */}
      <p className="text-[0.875rem] font-semibold text-[#242d48] leading-[1.2] line-clamp-2">
        {issue.summary}
      </p>
      {/* ADS: cranberry 13px/400, #485478 */}
      <p className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2] mt-1 line-clamp-1">
        {issue.subject}
      </p>
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1.5">
          {/* ADS Badge: 2px radius, uppercase, outlined */}
          <span className="text-[0.75rem] font-medium text-[#3c67ea] border border-[#3c67ea] rounded-[2px] px-1">
            {issue.key}
          </span>
          <AlertCircle className={cn("w-3 h-3 flex-shrink-0", priorityColor)} />
          <span className="flex items-center gap-0.5 text-[0.75rem] font-normal text-[#485478]">
            <ListChecks className="w-3 h-3" />
            {issue.subtasksDone}/{issue.subtasksTotal}
          </span>
        </div>
        {/* ADS Avatar: 33% radius, #485478 bg, white text */}
        <div
          className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-[#485478] text-white text-[0.75rem] font-semibold"
          style={{ borderRadius: "33%" }}
          title={issue.assignee}
        >
          {issue.assignee}
        </div>
      </div>
      {/* ADS: cranberry 13px/400, #485478 */}
      <p className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2] mt-1">
        Updated {issue.updatedAt}
      </p>
      {/* Transition buttons — ADS Button variants */}
      {steps.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#e6ebf8] flex items-center gap-1.5 flex-wrap">
          {steps.map(step => (
            <button
              key={step.status}
              onClick={() => onTransition(issue.id, step.status)}
              className={cn(
                // ADS: 2px radius, 8px×16px padding, 14px/600, transition
                "px-4 py-2 rounded-[2px] text-[0.875rem] font-semibold leading-[1.2] transition-all duration-200",
                step.color
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
    bg: "bg-[#f8f8fa]", border: "border-[#e6ebf8]",
    badge: "border-[#485478] text-[#485478]", dot: "bg-[#909cc0]", icon: AlertCircle,
  };
  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      {/* ADS column header: white bg, #E6EBF8 border, 4px radius */}
      <div className="flex items-center justify-between px-3 py-2 rounded-[4px] bg-white border border-[#e6ebf8] mb-2">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 flex-shrink-0 rounded-full", style.dot)} />
          {/* ADS: blueberry 12px/500 UPPERCASE */}
          <span className="text-[0.75rem] font-medium text-[#242d48] leading-[1.2]">
            {name}
          </span>
        </div>
        {/* ADS Badge: 2px radius, outlined */}
        <span className={cn("text-[0.75rem] font-medium px-1 rounded-[2px] border", style.badge)}>
          {issues.length}
        </span>
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1 min-h-[120px]">
        {issues.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-[4px] border border-dashed border-[#e6ebf8] py-8">
            <span className="text-[0.875rem] font-normal text-[#909cc0] leading-[1.2]">
              No issues
            </span>
          </div>
        ) : (
          issues.map(issue => (
            <IssueCard key={issue.id} issue={issue} onTransition={onTransition} />
          ))
        )}
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
    { name: "In Progress",  value: counts.inProgress,  color: "#3c67ea" },
    { name: "Cancelled",    value: counts.cancelled,   color: "#909cc0" },
    { name: "Under Review", value: counts.underReview, color: "#5858e9" },
    { name: "Rejected",     value: counts.rejected,    color: "#db3743" },
    { name: "Approved",     value: counts.approved,    color: "#ffbb16" },
    { name: "Done",         value: counts.done,        color: "#14a687" },
  ].filter(d => d.value > 0);
  const summaryCards = [
    { label: "Under Review", value: counts.underReview, sub: "Awaiting decision",           Icon: Clock,         color: "text-[#3c67ea]",   bg: "bg-[#f0f1f7]",   border: "border-[#e6ebf8]"   },
    { label: "Rejected",     value: counts.rejected,    sub: "Blocked issues",               Icon: Ban,           color: "text-[#db3743]",    bg: "bg-white",    border: "border-[#db3743]"    },
    { label: "Approved",     value: counts.approved,    sub: "Ready to send",                Icon: CheckCircle,   color: "text-[#ffbb16]",  bg: "bg-white",  border: "border-[#ffbb16]"  },
    { label: "Pass Rate",    value: `${passRate}%`,     sub: `${counts.done} of ${total} done`, Icon: CheckCircle2, color: "text-[#14a687]", bg: "bg-white",  border: "border-[#14a687]"  },
  ];
  return (
    <div className="app-bg min-h-screen">
      {/* ADS PageHeader: 56px, white, border-b #E6EBF8 */}
      <header
        style={{ display: "grid", gridTemplateAreas: "'back header actions'", gridTemplateColumns: "min-content 1fr auto", alignItems: "center" }}
        className="w-full h-[56px] bg-white border-b border-[#e6ebf8] px-4"
      >
        <div style={{ gridArea: "header" }} className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-4 h-4 text-[#3c67ea] shrink-0" />
          {/* ADS grapefruit: 22px/600 */}
          <h1 className="text-[1.375rem] font-semibold leading-[1.5] text-[#242d48]">Pipeline</h1>
          <span className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2]">
            · {total} issues
          </span>
        </div>
        <div style={{ gridArea: "actions" }}>
          {/* ADS Secondary button */}
          <button className="inline-flex items-center gap-2 py-2 px-4 rounded-[2px] text-[0.875rem] font-semibold leading-[1.2] shadow-[inset_0_0_0_1px_#3c67ea] text-[#3c67ea] hover:bg-[#f0f1f7] hover:shadow-[inset_0_0_0_2px_#1947ba] hover:text-[#1947ba] transition-all duration-200">
            <RefreshCw className="w-4 h-4" />
            Sync All
          </button>
        </div>
      </header>
      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* KPI Cards + Donut — ADS Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            {summaryCards.map((card) => (
              // ADS Card: 4px radius, white, #E6EBF8 border, L1 shadow
              <div key={card.label} className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-[4px] shrink-0", card.bg)}>
                  <card.Icon className={cn("w-4 h-4", card.color)} />
                </div>
                <div className="min-w-0">
                  {/* ADS: blueberry 12px/500 UPPERCASE, #485478 */}
                  <p className="text-[0.75rem] font-medium text-[#485478] leading-[1.2] truncate">
                    {card.label}
                  </p>
                  {/* ADS: watermelon 44px/600 */}
                  <p className={cn("text-[1.375rem] font-semibold leading-[1.2]", card.color)}>
                    {card.value}
                  </p>
                  {/* ADS: cranberry 13px/400, #485478 */}
                  <p className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2] truncate">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Status donut — ADS Card with ADS chart palette */}
          <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#3c67ea]" />
              {/* ADS: apple 16px/600 */}
              <span className="text-[1rem] font-semibold text-[#242d48] leading-[1.2]">Status Distribution</span>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius="42%" outerRadius="70%" dataKey="value" paddingAngle={3}>
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 4,              // ADS 4px
                      border: "1px solid #e6ebf8",  // ADS border
                      boxShadow: "0 2px 4px rgba(36,45,72,0.15)", // ADS L1
                      fontSize: 13,                 // ADS 13px
                      color: "#242d48",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {donutData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    {/* ADS: cranberry 13px/400, #485478 */}
                    <span className="text-[0.8125rem] font-normal text-[#485478] uppercase leading-[1.2]">{d.name}</span>
                  </div>
                  <span className="text-[0.875rem] font-semibold text-[#242d48] leading-[1.2]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
          {COLUMN_ORDER.map(col => (
            <BoardColumn
              key={col}
              name={col}
              issues={issues.filter(i => i.status === col)}
              onTransition={transition}
            />
          ))}
        </div>
        {/* Footer info — ADS: cranberry 13px, #485478 */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="w-2 h-2 rounded-full bg-[#14a687]" />
          <p className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2]">
            Live data from Jira Cloud · Synced with project pipeline
          </p>
        </div>
      </div>
    </div>
  );
}
