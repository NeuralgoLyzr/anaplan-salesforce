"use client";

import { useState } from "react";
import {
  Sparkles, ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2,
  Mail, CalendarClock, FileText, ClipboardCheck, Database, Circle,
} from "lucide-react";
import type { Session } from "@/lib/rev-rec/types";
import {
  getActionItems, prettyTrigger, SEVERITY_STYLE,
  type ActionItemView, type ActionCategory,
} from "@/lib/rev-rec/view";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail, calendar: CalendarClock, file: FileText, review: ClipboardCheck, record: Database, dot: Circle,
};

function priorityBadge(p: string): { label: string; cls: string } | null {
  if (p === "before_approval") return { label: "Before approval", cls: "bg-amber-500/10 text-amber-600 border-amber-400/20" };
  if (p === "post_approval") return { label: "After approval", cls: "bg-muted/60 text-muted-foreground border-border/50" };
  return null;
}

interface Props {
  session: Session;
  onAction: (actionId: string, decision: "accept" | "reject") => Promise<void>;
}

export function RecommendedActions({ session, onAction }: Props) {
  const { categories, total, blocking } = getActionItems(session);

  // Default-open the first category so the pattern is visible.
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set(categories[0] ? [categories[0].key] : []));

  if (total === 0) return null;

  const toggleCat = (k: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3 space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Recommended actions</span>
        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{total} action{total === 1 ? "" : "s"}</span>
        {blocking > 0 && (
          <span className="text-[10px] font-medium bg-red-500/10 text-red-600 border border-red-400/20 px-1.5 py-0.5 rounded-full">{blocking} blocking</span>
        )}
      </div>

      {categories.map((cat) => (
        <CategoryCard
          key={cat.key}
          category={cat}
          open={openCats.has(cat.key)}
          onToggle={() => toggleCat(cat.key)}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  category, open, onToggle, onAction,
}: {
  category: ActionCategory;
  open: boolean;
  onToggle: () => void;
  onAction: (actionId: string, decision: "accept" | "reject") => Promise<void>;
}) {
  const Icon = ICONS[category.iconKey] ?? Circle;
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{category.label}</span>
          <span className="text-[10px] font-medium bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full">
            {category.items.length} action{category.items.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {open ? "Collapse" : "Expand"}
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {category.items.map((item) => (
            <ActionCard key={item.actionId} item={item} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  item, onAction,
}: {
  item: ActionItemView;
  onAction: (actionId: string, decision: "accept" | "reject") => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [performing, setPerforming] = useState(false);
  const sev = SEVERITY_STYLE[item.severity];
  const prio = priorityBadge(item.priority);

  async function decide(decision: "accept" | "reject") {
    try {
      if (decision === "accept") {
        setPerforming(true);
        await new Promise((r) => setTimeout(r, 900)); // show the loader — task being performed
      }
      await onAction(item.actionId, decision);
    } finally {
      setPerforming(false);
    }
  }

  const statusPill =
    item.status === "accepted"
      ? { label: "Performed", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-400/20" }
      : item.status === "rejected"
      ? { label: "Dismissed", cls: "bg-red-500/10 text-red-600 border-red-400/20" }
      : { label: "Pending", cls: "bg-amber-500/10 text-amber-600 border-amber-400/20" };

  return (
    <div className="rounded-xl border border-primary/[0.08] bg-background/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-primary/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-foreground truncate">{item.title}</span>
          <span className={cn("shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full border", sev.pill)}>{sev.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", statusPill.cls)}>{statusPill.label}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {open ? "Collapse" : "Expand"}
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-primary/[0.06]">
          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
              {prettyTrigger(item.uiTrigger)}
            </span>
            {item.targetRole && (
              <span className="text-[10px] text-muted-foreground">→ {item.targetRole}</span>
            )}
            {prio && <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", prio.cls)}>{prio.label}</span>}
            {item.blocking && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-400/20">Blocking</span>
            )}
          </div>

          {item.context && <p className="text-[12px] text-muted-foreground leading-relaxed">{item.context}</p>}
          {item.whatToCheck && (
            <p className="text-[12px] text-foreground/60 leading-relaxed">
              <span className="font-medium text-foreground/70">What to check:</span> {item.whatToCheck}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/70">
            From anomaly: <span className="text-foreground/60">{item.anomalyTitle}</span>
          </p>
          {item.citations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.citations.map((c, i) => (
                <span key={i} className="text-[10px] text-muted-foreground/80 font-mono bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
          )}

          {/* Footer: decision / loader / status */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-primary/[0.06]">
            <p className="text-[11px] text-amber-700/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Accepting will perform this action.
            </p>
            {performing ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                <Loader2 className="w-4 h-4 animate-spin" /> Performing task…
              </span>
            ) : item.status === "pending" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => decide("reject")}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => decide("accept")}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                </button>
              </div>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[12px] font-medium",
                  item.status === "accepted" ? "text-emerald-700" : "text-red-700"
                )}
              >
                {item.status === "accepted" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {item.status === "accepted" ? "Task performed" : "Dismissed"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
