"use client";

import { ReactNode, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, FolderOpen, FileText, Brain, Cpu, CheckCircle2,
  Save, AlertTriangle, Loader2, Zap, Bot, ChevronDown, ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { JourneyState } from "@/hooks/use-journey-stream";

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  book: BookOpen,
  folder: FolderOpen,
  file: FileText,
  brain: Brain,
  cpu: Bot,
  check: CheckCircle2,
  save: Save,
  alert: AlertTriangle,
};

function PipelineStepIcon({ icon, isLatest, isDone }: { icon: string; isLatest: boolean; isDone: boolean }) {
  const size = "w-3.5 h-3.5";
  if (isLatest) return <Loader2 className={`${size} text-primary animate-spin`} />;
  if (isDone) return <CheckCircle2 className={`${size} text-primary`} />;
  const Icon = ICON_MAP[icon] || Cpu;
  return <Icon className={`${size} text-muted-foreground`} />;
}

function getStepCategory(icon: string): string {
  if (icon === "search" || icon === "book") return "skill";
  if (icon === "folder" || icon === "file") return "knowledge";
  if (icon === "brain" || icon === "cpu") return "llm";
  if (icon === "save" || icon === "check") return "output";
  return "config";
}

const CATEGORY_BG: Record<string, string> = {
  config: "bg-primary/[0.06]",
  skill: "bg-primary/[0.06]",
  knowledge: "bg-primary/[0.04]",
  llm: "bg-primary/[0.08]",
  output: "bg-primary/[0.06]",
};

// TODO: Replace mock content with a real API call to your file storage backend.
// Fetch file content from your API: GET /api/files?path=<filePath>
function FilePreviewInline({ filePath }: { filePath: string }) {
  // Mock content — replace with: const [content, setContent] = useState<string | null>(null);
  // then fetch from your backend and call setContent(data.content)
  const content = `# ${filePath.split("/").pop()}\n\nConnect your file storage backend to load this file.\n\nPath: \`${filePath}\``;
  const loading = false;
  const error: string | null = null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-1.5 ml-6 mr-1 rounded-lg border border-primary/15 bg-background/80 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-primary/10 bg-primary/[0.04]">
          <FileText className="w-3 h-3 text-primary/60 flex-shrink-0" />
          <span className="text-[10px] font-medium text-foreground/60 truncate">{filePath.split("/").pop()}</span>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="ml-1.5 text-[10px] text-muted-foreground">Loading...</span>
            </div>
          )}
          {error && <div className="text-[10px] text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</div>}
          {content !== null && !loading && (
            filePath.endsWith(".md") ? (
              <div className="prose prose-xs max-w-none prose-headings:text-foreground prose-headings:text-xs prose-p:text-[10px] prose-p:text-foreground/80 prose-li:text-[10px] prose-li:text-foreground/80 prose-strong:text-foreground [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-[11px] [&_table]:text-[10px] [&_p]:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface JourneyLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  state: JourneyState;
  formContent: ReactNode;
  onExecute: () => void;
  executeLabel?: string;
  executeDisabled?: boolean;
  sampleDataToggle?: ReactNode;
}

export function JourneyLayout({
  title,
  subtitle,
  icon: TitleIcon,
  state,
  formContent,
  onExecute,
  executeLabel = "Execute",
  executeDisabled = false,
  sampleDataToggle,
}: JourneyLayoutProps) {
  const activityEndRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [pipelineCollapsed, setPipelineCollapsed] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const isUserAtBottomRef = useRef(true);
  const wasRunningRef = useRef(false);

  const handleOutputScroll = () => {
    const el = outputRef.current;
    if (!el) return;
    isUserAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    if (!pipelineCollapsed && isUserAtBottomRef.current) {
      activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.activities.length, pipelineCollapsed]);

  useEffect(() => {
    if (state.output && outputRef.current) {
      if (wasRunningRef.current && isUserAtBottomRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      } else if (!wasRunningRef.current) {
        outputRef.current.scrollTop = 0;
      }
    }
  }, [state.output]);

  useEffect(() => {
    if (state.isRunning) {
      wasRunningRef.current = true;
      setPipelineCollapsed(false);
      isUserAtBottomRef.current = true;
    } else {
      wasRunningRef.current = false;
    }
  }, [state.isRunning]);

  const hasOutput = state.output.length > 0;
  const hasActivity = state.activities.length > 0;
  const skillSteps = state.activities.filter(a => a.icon === "search" || a.icon === "book");
  const knowledgeSteps = state.activities.filter(a => a.icon === "folder" || a.icon === "file");

  return (
    <div className="flex h-full min-h-0">
      {/* Left: form panel */}
      <div className="w-[340px] md:w-[380px] flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30">
        <div className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/15 flex-shrink-0">
              <TitleIcon className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-base font-bold text-foreground flex-1">{title}</h1>
            {sampleDataToggle}
          </div>
          <p className="text-xs text-muted-foreground ml-[38px]">{subtitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {formContent}
        </div>

        <div className="p-4 border-t border-border/50">
          <button
            onClick={onExecute}
            disabled={state.isRunning || executeDisabled}
            className={cn(
              "w-full py-2.5 rounded-lg font-semibold text-sm transition-all",
              state.isRunning
                ? "bg-primary/20 text-primary/60 cursor-wait"
                : executeDisabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-gradient-to-r from-primary to-primary-gradient-end text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
            )}
          >
            {state.isRunning ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : executeLabel}
          </button>
        </div>
      </div>

      {/* Right: output panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {!hasActivity && !hasOutput ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-sm px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto">
                <TitleIcon className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                Fill in the parameters and click <strong>{executeLabel}</strong> to start.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Agent activity and the generated deliverable will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" ref={outputRef} onScroll={handleOutputScroll}>
            {hasActivity && (
              <div className="mx-5 mt-4 mb-3">
                <div className="glass-card rounded-xl overflow-hidden">
                  <button
                    onClick={() => setPipelineCollapsed(!pipelineCollapsed)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-black/[0.02] transition-colors"
                  >
                    {pipelineCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-primary/60" />
                      : <ChevronDown className="w-3.5 h-3.5 text-primary/60" />
                    }
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {state.isRunning
                        ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      }
                      <span className="text-xs font-semibold text-foreground/80">
                        {state.isRunning ? "Agent Pipeline Running..." : "Agent Pipeline Complete"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                      {skillSteps.length > 0 && (
                        <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> {skillSteps.length} skills</span>
                      )}
                      {knowledgeSteps.length > 0 && (
                        <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" /> {knowledgeSteps.length} files</span>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {!pipelineCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-0.5 border-t border-black/[0.04]">
                          {state.activities.map((act, i) => {
                            const category = getStepCategory(act.icon);
                            const isLast = i === state.activities.length - 1;
                            const isDone = !isLast || !state.isRunning;
                            const hasFile = !!act.filePath;
                            const isExpanded = expandedRow === i;
                            return (
                              <div key={i}>
                                <motion.div
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.03 * Math.min(i, 10) }}
                                  onClick={hasFile ? () => setExpandedRow(isExpanded ? null : i) : undefined}
                                  className={cn(
                                    "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md mt-0.5",
                                    CATEGORY_BG[category] || "bg-primary/[0.04]",
                                    hasFile && "cursor-pointer hover:bg-primary/[0.12] transition-colors",
                                    isExpanded && "bg-primary/[0.12]"
                                  )}
                                >
                                  <PipelineStepIcon icon={act.icon} isLatest={isLast && state.isRunning} isDone={isDone} />
                                  <span className="text-[11px] text-foreground/70 leading-relaxed flex-1">{act.action}</span>
                                  {hasFile && (
                                    <ChevronDown className={cn("w-3 h-3 text-primary/40 transition-transform duration-200", isExpanded && "rotate-180")} />
                                  )}
                                </motion.div>
                                <AnimatePresence>
                                  {isExpanded && act.filePath && <FilePreviewInline filePath={act.filePath} />}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                          <div ref={activityEndRef} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {hasOutput && (
              <div className="px-6 pb-6">
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-th:text-foreground/70 prose-td:text-foreground/70">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.output}</ReactMarkdown>
                </div>
              </div>
            )}

            {state.error && (
              <div className="p-4 mx-5 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">{state.error}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface FormFieldProps { label: string; required?: boolean; children: ReactNode }

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/70">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("w-full px-3 py-2 rounded-lg bg-background/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors", className)}
      {...props}
    />
  );
}

export function FormSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("w-full px-3 py-2 rounded-lg bg-background/60 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors", className)}
      {...props}
    >
      {children}
    </select>
  );
}

interface CheckboxGroupProps { options: string[]; selected: string[]; onChange: (s: string[]) => void }

export function CheckboxGroup({ options, selected, onChange }: CheckboxGroupProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={e => {
              if (e.target.checked) onChange([...selected, opt]);
              else onChange(selected.filter(s => s !== opt));
            }}
            className="rounded border-border/50 text-primary focus:ring-primary/30"
          />
          <span className="text-xs text-foreground/70">{opt}</span>
        </label>
      ))}
    </div>
  );
}

export function SampleDataToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all flex-shrink-0",
        enabled
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
      )}
      title={enabled ? "Sample data loaded (Meridian Manufacturing)" : "Load Meridian sample data"}
    >
      {enabled ? "Meridian Sample" : "Sample Data"}
    </button>
  );
}
