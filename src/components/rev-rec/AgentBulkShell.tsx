"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, RefreshCw, FileText, Clock, CheckCircle2,  } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IntegratedSystemsCard } from "@/components/integrations/IntegratedSystemsCard";
import { isBusy, formatDate } from "@/lib/rev-rec/ui";
import type { Session } from "@/lib/rev-rec/types";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
export interface AgentBulkShellProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  // Decide whether a given session has any relevant data to render for this agent.
  hasContent: (session: Session) => boolean;
  // When provided, a Pending / Completed filter tab is rendered at the top and
  // sessions are split into the two groups. Returning `true` puts the session
  // in "Pending action"; `false` puts it in "Completed action". Per-agent
  // semantics, e.g.:
  //   Reader  → reader output not yet complete
  //   Pricing → status === "gate1" (revenue plan awaiting approval)
  //   Anomaly → at least one action_item still pending
  //   Bills   → at least one invoice still "actionable"
  isPending?: (session: Session) => boolean;
  // Optional secondary right-hand element (e.g. a "Bulk approve" button).
  toolbar?: (sessions: Session[], refresh: () => void) => React.ReactNode;
  // Renders the agent-specific body for one customer's session.
  renderSession: (session: Session, refresh: () => void) => React.ReactNode;
  // Optional: an agent-scoped status pill (e.g. "Action needed") rendered next
  // to the company name. Return null/undefined to omit the pill entirely for
  // customers where this agent doesn't require user action.
  rowPill?: (session: Session) => React.ReactNode;
  // Optional: short info hint per session (file/invoice counts, etc.).
  rowSummary?: (session: Session) => React.ReactNode;
  // Hint shown when no sessions have content for this agent.
  emptyHint?: string;
}
type FilterTab = "pending" | "completed";
export function AgentBulkShell(props: AgentBulkShellProps) {
  const { title, subtitle, icon: HeaderIcon, hasContent, isPending, toolbar, renderSession, rowPill, rowSummary, emptyHint } = props;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("pending");
  const inflight = useRef(false);
  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const listRes = await fetch("/api/companies", { cache: "no-store" });
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error ?? "Failed to load");
      const ids: string[] = (listData.companies ?? []).map((c: { session_id: string }) => c.session_id);
      const details = await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(`/api/companies/${id}`, { cache: "no-store" });
          const d = await r.json();
          return r.ok ? (d.session as Session) : null;
        })
      );
      setSessions(details.filter((s): s is Session => s != null));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // Light auto-refresh while any customer is still running.
  useEffect(() => {
    const anyBusy = sessions.some((s) => isBusy(s.status));
    if (!anyBusy) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [sessions, load]);
  const allVisible = useMemo(() => sessions.filter(hasContent), [sessions, hasContent]);
  // Filter-tab partition — only meaningful when isPending is supplied.
  const pendingCount = useMemo(
    () => (isPending ? allVisible.filter(isPending).length : 0),
    [allVisible, isPending],
  );
  const completedCount = allVisible.length - pendingCount;
  const visible = useMemo(() => {
    if (!isPending) return allVisible;
    return allVisible.filter((s) => (filterTab === "pending" ? isPending(s) : !isPending(s)));
  }, [allVisible, isPending, filterTab]);
  return (
    <div className="space-y-5 px-4 sm:px-6 py-5 pb-12">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center">
            <HeaderIcon className="w-4 h-4 text-[#3c67ea]" />
          </div>
          <div>
            <p className="text-[0.75rem] uppercase text-[#485478] font-medium">Agents</p>
            <h1 className="text-[1.125rem] font-semibold leading-[1.2] text-[#242d48]">{title}</h1>
            <p className="text-[0.75rem] text-[#485478] font-medium">
              {subtitle} · {visible.length} customer{visible.length === 1 ? "" : "s"}
              {isPending && (
                <span className="text-[#485478]">
                  {" "}in {filterTab === "pending" ? "pending" : "completed"}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <button
            onClick={load}
            className="p-2 rounded-[4px] text-[#485478] hover:text-[#242d48] hover:bg-[#f0f1f7] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {toolbar?.(visible, load)}
        </div>
      </div>
      {/* Integrated systems */}
      <IntegratedSystemsCard
        items={[
          { id: "salesforce", name: "Salesforce", logoSrc: "/Salesforce.com_logo.svg.png", connected: true },
          { id: "anaplan-mcp", name: "Anaplan MCP", logoSrc: "/PLAN-82aa46a2.png", connected: true },
        ]}
      />
      {/* Pending / Completed filter tabs */}
      {isPending && (
        <div className="flex items-center gap-1 bg-[#f0f1f7] rounded-[4px] p-1 w-fit">
          <FilterTabButton
            active={filterTab === "pending"}
            label="Pending action"
            count={pendingCount}
            icon={Clock}
            onClick={() => setFilterTab("pending")}
            activeCls="bg-white text-[#242d48] font-semibold shadow-[0_1px_3px_rgba(36,45,72,0.15)]"
          />
          <FilterTabButton
            active={filterTab === "completed"}
            label="Completed action"
            count={completedCount}
            icon={CheckCircle2}
            onClick={() => setFilterTab("completed")}
            activeCls="bg-white text-[#242d48] font-semibold shadow-[0_1px_3px_rgba(36,45,72,0.15)]"
          />
        </div>
      )}
      {error && (
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4 border border-[#f2919d] text-[0.875rem] leading-[1.2] text-[#db3743]">
          {error}
        </div>
      )}
      {/* Customer collapsible list */}
      {loading ? (
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-8 text-center">
          <Loader size="small" className="mx-auto" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-8 text-center">
          <p className="text-[0.875rem] leading-[1.2] font-medium text-[#242d48]">
            {isPending
              ? filterTab === "pending"
                ? "Nothing pending"
                : "No completed items yet"
              : "Nothing to show yet"}
          </p>
          <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] mt-1">
            {isPending && filterTab === "pending"
              ? "All customers on this agent have been actioned."
              : isPending && filterTab === "completed"
              ? "Items move here once their action is performed or dismissed."
              : emptyHint ?? "Customers will appear once the pipeline reaches this agent."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((session) => (
            <CustomerCollapsible
              key={session.session_id}
              session={session}
              rowPill={rowPill}
              rowSummary={rowSummary}
              defaultOpen={visible.length === 1}
            >
              {renderSession(session, load)}
            </CustomerCollapsible>
          ))}
        </div>
      )}
    </div>
  );
}
function FilterTabButton({
  active, label, count, icon: Icon, onClick, activeCls,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  activeCls: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[0.75rem] font-medium transition-all",
        active ? activeCls : "text-[#485478] hover:text-[#242d48]",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span className={cn(
        "text-[0.75rem] font-medium px-1 py-0 rounded-[2px] border",
        active ? "bg-white" : "bg-[#f0f1f7]",
      )}>
        {count}
      </span>
    </button>
  );
}
function CustomerCollapsible({
  session, defaultOpen, rowPill, rowSummary, children,
}: {
  session: Session;
  defaultOpen: boolean;
  rowPill?: (s: Session) => React.ReactNode;
  rowSummary?: (s: Session) => React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen((o) => !o);
  const pill = rowPill?.(session);
  return (
    <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        }}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#f0f1f7] transition-colors text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-[#242d48] truncate">{session.company_name}</span>
          </span>
          {pill}
          <span className="inline-flex items-center gap-1 text-[0.75rem] text-[#485478]">
            <FileText className="w-3 h-3" /> {session.uploaded_files.length}
          </span>
          {rowSummary?.(session)}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[0.75rem] text-[#485478] whitespace-nowrap">
            {formatDate(session.updated_at)}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); router.push(`/customers/${session.session_id}`); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault(); e.stopPropagation();
                router.push(`/customers/${session.session_id}`);
              }
            }}
            className="text-[0.75rem] font-medium text-[#3c67ea] hover:underline"
          >
            Open
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-[#485478]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#485478]" />
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden border-t border-[#e6ebf8]"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
