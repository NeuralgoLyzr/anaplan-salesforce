"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, Loader2, RefreshCw, FileText, Cloud,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IntegratedSystemsCard } from "@/components/integrations/IntegratedSystemsCard";
import { isBusy, formatDate } from "@/lib/rev-rec/ui";
import type { Session } from "@/lib/rev-rec/types";

export interface AgentBulkShellProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  // Decide whether a given session has any relevant data to render for this agent.
  hasContent: (session: Session) => boolean;
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

export function AgentBulkShell(props: AgentBulkShellProps) {
  const { title, subtitle, icon: HeaderIcon, hasContent, toolbar, renderSession, rowPill, rowSummary, emptyHint } = props;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const visible = useMemo(() => sessions.filter(hasContent), [sessions, hasContent]);

  return (
    <div className="space-y-5 px-4 sm:px-6 py-5 pb-12">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <HeaderIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Agents</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              {subtitle} · {visible.length} customer{visible.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
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

      {error && (
        <div className="glass-card rounded-xl p-4 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Customer collapsible list */}
      {loading ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-foreground/70">Nothing to show yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {emptyHint ?? "Customers will appear once the pipeline reaches this agent."}
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
    <div className="glass-card rounded-xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        }}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary/[0.03] transition-colors text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-foreground truncate">{session.company_name}</span>
            {session.source === "salesforce" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-600 border-blue-400/20">
                <Cloud className="w-2.5 h-2.5" /> Salesforce
              </span>
            )}
          </span>
          {pill}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <FileText className="w-3 h-3" /> {session.uploaded_files.length}
          </span>
          {rowSummary?.(session)}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
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
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Open
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
            className="overflow-hidden border-t border-primary/[0.06]"
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
