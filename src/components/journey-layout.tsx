"use client";
import { ReactNode, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, FolderOpen, FileText, Brain, Cpu, CheckCircle2, Save, AlertTriangle, Zap, Bot, ChevronDown, ChevronRight,  } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { JourneyState } from "@/hooks/use-journey-stream";
import { Loader } from "@/components/ui/loader";
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
  if (isLatest) return <Loader size="inline" />;
  if (isDone) return <CheckCircle2 className={`${size} text-[#3c67ea]`} />;
  const Icon = ICON_MAP[icon] || Cpu;
  return <Icon className={`${size} text-[#485478]`} />;
}
function getStepCategory(icon: string): string {
  if (icon === "search" || icon === "book") return "skill";
  if (icon === "folder" || icon === "file") return "knowledge";
  if (icon === "brain" || icon === "cpu") return "llm";
  if (icon === "save" || icon === "check") return "output";
  return "config";
}
const CATEGORY_BG: Record<string, string> = {
  config: "bg-[#f0f1f7]]",
  skill: "bg-[#f0f1f7]]",
  knowledge: "bg-[#f0f1f7]]",
  llm: "bg-[#f0f1f7]]",
  output: "bg-[#f0f1f7]]",
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
      <div className="mt-1.5 ml-6 mr-1 rounded-[4px] border border-[#e6ebf8] bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#e6ebf8] bg-[#f0f1f7]]">
          <FileText className="w-3 h-3 text-[#3c67ea] flex-shrink-0" />
          <span className="text-[0.75rem] font-medium text-[#242d48] truncate">{filePath.split("/").pop()}</span>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader size="inline" />
              <span className="ml-1.5 text-[0.75rem] text-[#485478]">Loading...</span>
            </div>
          )}
          {error && <div className="text-[0.75rem] text-[#db3743] bg-white px-3 py-2 rounded">{error}</div>}
          {content !== null && !loading && (
            filePath.endsWith(".md") ? (
              <div className="prose prose-xs max-w-none prose-headings:text-[#242d48] prose-headings:text-[0.75rem] uppercase tracking-[0.08em] prose-p:text-[0.75rem] prose-p:text-[#242d48] prose-li:text-[0.75rem] prose-li:text-[#242d48] prose-strong:text-[#242d48] [&_h1]:text-[0.875rem] leading-[1.2] [&_h2]:text-[0.75rem] tracking-[0.08em] [&_h3]:text-[0.75rem] [&_table]:text-[0.75rem] [&_p]:leading-[1.2]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <pre className="text-[0.75rem] text-[#242d48] whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
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
      <div className="w-[340px] md:w-[380px] flex-shrink-0 border-r border-[#e6ebf8]/50 flex flex-col bg-white">
        <div className="px-5 py-4 border-b border-[#e6ebf8]/50 bg-[#3c67ea]">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-[4px] bg-[#f0f1f7] flex-shrink-0">
              <TitleIcon className="w-4 h-4 text-[#3c67ea]" />
            </div>
            <h1 className="text-[1rem] leading-[1.2] font-semibold text-[#242d48] flex-1">{title}</h1>
            {sampleDataToggle}
          </div>
          <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] ml-[38px]">{subtitle}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {formContent}
        </div>
        <div className="p-4 border-t border-[#e6ebf8]/50">
          <button
            onClick={onExecute}
            disabled={state.isRunning || executeDisabled}
            className={cn(
              "w-full py-2.5 rounded-[4px] font-semibold text-[0.875rem] leading-[1.2] transition-all",
              state.isRunning
                ? "bg-[#f0f1f7] text-[#3c67ea] cursor-wait"
                : executeDisabled
                  ? "bg-[#f0f1f7] text-[#485478] cursor-not-allowed"
                  : "bg-[#3c67ea] text-white hover:opacity-90 shadow-[0_2px_4px_rgba(36,45,72,0.15)] shadow-primary/25"
            )}
          >
            {state.isRunning ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size="inline" />
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
              <div className="w-16 h-16 rounded-[4px] bg-[#f0f1f7]] flex items-center justify-center mx-auto">
                <TitleIcon className="w-8 h-8 text-[#3c67ea]" />
              </div>
              <p className="text-[0.875rem] leading-[1.2] text-[#485478]">
                Fill in the parameters and click <strong>{executeLabel}</strong> to start.
              </p>
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">
                Agent activity and the generated deliverable will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" ref={outputRef} onScroll={handleOutputScroll}>
            {hasActivity && (
              <div className="mx-5 mt-4 mb-3">
                <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] overflow-hidden">
                  <button
                    onClick={() => setPipelineCollapsed(!pipelineCollapsed)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#f0f1f7] transition-colors"
                  >
                    {pipelineCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-[#3c67ea]" />
                      : <ChevronDown className="w-3.5 h-3.5 text-[#3c67ea]" />
                    }
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {state.isRunning
                        ? <Loader size="inline" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-[#3c67ea]" />
                      }
                      <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#242d48]">
                        {state.isRunning ? "Agent Pipeline Running..." : "Agent Pipeline Complete"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[0.75rem] text-[#485478]">
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
                        <div className="px-4 pb-3 space-y-0.5 border-t border-[#e6ebf8]">
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
                                    "flex items-center gap-2.5 py-1.5 px-2.5 rounded-[4px] mt-0.5",
                                    CATEGORY_BG[category] || "bg-[#f0f1f7]]",
                                    hasFile && "cursor-pointer hover:bg-[#f0f1f7]] transition-colors",
                                    isExpanded && "bg-[#f0f1f7]]"
                                  )}
                                >
                                  <PipelineStepIcon icon={act.icon} isLatest={isLast && state.isRunning} isDone={isDone} />
                                  <span className="text-[0.75rem] text-[#242d48] leading-[1.2] flex-1">{act.action}</span>
                                  {hasFile && (
                                    <ChevronDown className={cn("w-3 h-3 text-[#3c67ea] transition-transform duration-200", isExpanded && "rotate-180")} />
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
                <div className="prose prose-sm max-w-none prose-headings:text-[#242d48] prose-p:text-[#242d48] prose-li:text-[#242d48] prose-strong:text-[#242d48] prose-th:text-[#242d48] prose-td:text-[#242d48]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.output}</ReactMarkdown>
                </div>
              </div>
            )}
            {state.error && (
              <div className="p-4 mx-5 mb-4 rounded-[4px] bg-white border border-[#db3743]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#db3743]" />
                  <span className="text-[0.875rem] leading-[1.2] text-[#db3743]">{state.error}</span>
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
      <label className="text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#242d48]">
        {label}{required && <span className="text-[#db3743] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
export function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("w-full px-3 py-2 rounded-[4px] bg-[#f8f8fa] border border-[#e6ebf8]/50 text-[0.875rem] leading-[1.2] text-[#242d48] placeholder:text-[#485478] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-[#e6ebf8] transition-colors", className)}
      {...props}
    />
  );
}
export function FormSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("w-full px-3 py-2 rounded-[4px] bg-[#f8f8fa] border border-[#e6ebf8]/50 text-[0.875rem] leading-[1.2] text-[#242d48] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-[#e6ebf8] transition-colors", className)}
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
        <label key={opt} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] hover:bg-[#f0f1f7] cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={e => {
              if (e.target.checked) onChange([...selected, opt]);
              else onChange(selected.filter(s => s !== opt));
            }}
            className="rounded border-[#e6ebf8]/50 text-[#3c67ea] focus:ring-primary/30"
          />
          <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[#242d48]">{opt}</span>
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
        "flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[0.75rem] font-semibold transition-all flex-shrink-0",
        enabled
          ? "bg-[#f0f1f7] text-[#3c67ea] border border-[#e6ebf8]"
          : "bg-[#f0f1f7] text-[#485478] border border-[#e6ebf8]/50 hover:bg-[#f0f1f7]"
      )}
      title={enabled ? "Sample data loaded (Meridian Manufacturing)" : "Load Meridian sample data"}
    >
      {enabled ? "Meridian Sample" : "Sample Data"}
    </button>
  );
}
