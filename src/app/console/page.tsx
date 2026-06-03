"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, Loader2, Play, Search, AlertCircle, RefreshCw,
  CheckCircle2, Zap, FileText, FolderOpen, ChevronDown, ChevronRight,
  Database, Cpu, X, Plug, Layers, Lock, History,
  Table2, ShieldAlert, Receipt, ShieldCheck, FileStack,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStream, ChatEvent } from "@/hooks/use-chat-stream";
import { useChatHistory, type ChatSession } from "@/hooks/use-chat-history";
import { ChatHistoryDrawer } from "@/components/ui/chat-history-drawer";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

function FileContentScroll({ content }: { content: string }) {
  return (
    <div className="max-h-[90px] overflow-hidden rounded-md bg-black/[0.03] border border-black/[0.04] px-3 py-2">
      <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">{content}</pre>
    </div>
  );
}

function PipelineStepIcon({ type, isActive, isDone }: { type: string; isActive: boolean; isDone: boolean }) {
  const size = "w-3.5 h-3.5";
  if (isActive) return <Loader2 className={`${size} text-primary animate-spin`} />;
  if (isDone) return <CheckCircle2 className={`${size} text-primary`} />;
  switch (type) {
    case "phase": return <Layers className={`${size} text-primary/60`} />;
    case "skill_loading": return <Zap className={`${size} text-muted-foreground`} />;
    case "skill_detect": return <Search className={`${size} text-muted-foreground`} />;
    case "skill_execute": return <Play className={`${size} text-muted-foreground`} />;
    case "skill_available": return <Zap className={`${size} text-muted-foreground/40`} />;
    case "file_fetch": return <FileText className={`${size} text-muted-foreground`} />;
    case "client_detect": return <FolderOpen className={`${size} text-muted-foreground`} />;
    case "workspace_scan": return <FolderOpen className={`${size} text-muted-foreground`} />;
    case "integration_check": return <Plug className={`${size} text-muted-foreground`} />;
    case "pipeline_ready": return <CheckCircle2 className={`${size} text-primary/60`} />;
    case "pipeline_start": return <Cpu className={`${size} text-muted-foreground`} />;
    case "llm_start": return <Bot className={`${size} text-primary`} />;
    case "system_read": return <FileText className={`${size} text-muted-foreground`} />;
    default: return <FolderOpen className={`${size} text-muted-foreground`} />;
  }
}

function getStepLabel(evt: ChatEvent): string {
  if (evt.meta?.action) return evt.meta.action;
  if (evt.type === "skill_loading") return `Loading skill: ${evt.data}`;
  if (evt.type === "file_fetch") return `Reading ${evt.data}`;
  return `${evt.data}`;
}

function getStepCategory(evt: ChatEvent): string | null {
  if (evt.type === "phase") return null;
  if (evt.type === "system_read") return evt.meta?.category || "config";
  if (["skill_loading", "skill_detect", "skill_execute", "skill_available"].includes(evt.type)) return "skill";
  if (evt.type === "file_fetch") return evt.meta?.category || "knowledge";
  if (["client_detect", "workspace_scan"].includes(evt.type)) return "workspace";
  if (evt.type === "integration_check") return "integration";
  if (["pipeline_ready", "llm_start"].includes(evt.type)) return "llm";
  return null;
}

const CATEGORY_BG: Record<string, string> = {
  config: "bg-primary/[0.06]",
  identity: "bg-primary/[0.06]",
  rules: "bg-primary/[0.06]",
  skill: "bg-secondary/[0.08]",
  knowledge: "bg-blue-500/[0.06]",
  workspace: "bg-warning/[0.06]",
  integration: "bg-success/[0.06]",
  llm: "bg-primary/[0.08]",
};

function IntegrationStatusBadge({ status }: { status: string }) {
  if (status === "configured") return <span className="text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">ACTIVE</span>;
  if (status === "requires_setup") return <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded">NEEDS SETUP</span>;
  return <span className="text-[9px] font-bold text-muted-foreground bg-black/[0.04] px-1.5 py-0.5 rounded">AVAILABLE</span>;
}

function AgentPipelineStream({ events, isStreaming }: { events: ChatEvent[]; isStreaming: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDone = !isStreaming && events.length > 0;

  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, isStreaming]);

  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => setIsCollapsed(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isDone]);

  const pipelineEvents = events.filter((e) => e.type !== "pipeline_start");
  const phaseEvents = events.filter((e) => e.type === "phase");
  const skillEvents = events.filter((e) => e.type === "skill_loading");
  const fileEvents = events.filter((e) => e.type === "file_fetch");
  const integrationEvents = events.filter((e) => e.type === "integration_check");

  if (isDone && isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl glass-card px-4 py-2.5 cursor-pointer transition-colors"
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs text-muted-foreground">
            Pipeline complete: {phaseEvents.length} phases, {skillEvents.length} skills loaded, {fileEvents.length} files read
            {integrationEvents.length > 0 && `, ${integrationEvents.length} integrations checked`}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-0">
      {isDone && !isCollapsed && (
        <div className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setIsCollapsed(true)}>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {pipelineEvents.length} pipeline steps
          </span>
        </div>
      )}
      <div ref={containerRef} className="space-y-0 max-h-[450px] overflow-y-auto">
        {pipelineEvents.map((evt, idx) => {
          const isLatest = idx === pipelineEvents.length - 1;
          const isActive = isLatest && isStreaming;
          const stepDone = !isActive;
          const hasPreview = !!evt.meta?.preview;
          const isLast = idx === pipelineEvents.length - 1;
          const category = getStepCategory(evt);
          const isPhase = evt.type === "phase";
          const hasSteps = evt.meta?.steps && evt.meta.steps.length > 0;
          const hasIntegrations = evt.meta?.integrations && evt.meta.integrations.length > 0;

          if (isPhase) {
            return (
              <motion.div key={`${evt.timestamp}-${idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-primary/10" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 px-2">
                    Phase {evt.meta?.phase}: {evt.meta?.name}
                  </span>
                  <div className="h-px flex-1 bg-primary/10" />
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={`${evt.timestamp}-${idx}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2.5 relative">
                {!isLast && <div className="absolute left-[7px] top-[20px] bottom-0 w-px bg-black/[0.06]" />}
                <div className={cn("flex-shrink-0 mt-1 relative z-10 rounded-full p-0.5", category ? CATEGORY_BG[category] : "")}>
                  <PipelineStepIcon type={evt.type} isActive={isActive} isDone={stepDone} />
                </div>
                <div className="flex-1 min-w-0 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs leading-tight", isActive ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {getStepLabel(evt)}
                    </span>
                    {evt.meta?.size && <span className="text-[9px] text-muted-foreground/50 font-mono">{evt.meta.size}</span>}
                    {evt.type === "integration_check" && evt.meta?.status && <IntegrationStatusBadge status={evt.meta.status} />}
                    {evt.meta?.isPrimary === true && <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">PRIMARY</span>}
                    {evt.meta?.isPrimary === false && evt.type === "skill_available" && (
                      <span className="text-[8px] font-medium text-muted-foreground bg-black/[0.04] px-1.5 py-0.5 rounded">STANDBY</span>
                    )}
                  </div>
                  {hasSteps && evt.type === "skill_loading" && (
                    <div className="mt-1.5 space-y-0.5">
                      {(evt.meta?.steps as string[]).slice(0, 3).map((step: string, si: number) => (
                        <div key={si} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                          <span className="text-primary/30">{si + 1}.</span>
                          <span className="truncate">{step}</span>
                        </div>
                      ))}
                      {(evt.meta?.steps?.length ?? 0) > 3 && <span className="text-[10px] text-muted-foreground/40">+{(evt.meta?.steps?.length ?? 0) - 3} more steps</span>}
                    </div>
                  )}
                  {hasIntegrations && (
                    <div className="mt-1.5 space-y-0.5">
                      {(evt.meta?.integrations as { name: string; action: string }[]).map((intg, ii) => (
                        <div key={ii} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                          <Plug className="w-2.5 h-2.5 text-success/50 flex-shrink-0" />
                          <span className="truncate">{intg.name}: {intg.action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <AnimatePresence>
                    {hasPreview && (isActive || (stepDone && evt.type === "file_fetch")) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: isActive ? 1 : 0.7, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1.5 overflow-hidden"
                      >
                        <FileContentScroll content={evt.meta!.preview} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const SKILL_JOURNEYS: Record<string, { name: string; icon: React.ComponentType<{ className?: string }>; description: string; steps: { label: string; detail: string }[]; integrations: { name: string; auth: string; actions: string[] }[] }> = {
  "reader": {
    name: "Reader Agent",
    icon: FileText,
    description: "Reads the SSA and Order Schedules to work out what's sold, the pricing, the term, and any special terms",
    steps: [
      { label: "Extract Documents", detail: "Parse the SSA and each Order Schedule (LlamaParse, unpdf fallback)" },
      { label: "Classify Each Doc", detail: "Master Subscription Agreement vs Order Schedule" },
      { label: "Pull Obligations", detail: "SKUs, quantities, performance obligations, term length" },
      { label: "Capture Special Terms", detail: "OS terms that override or nullify the overarching SSA" },
      { label: "Output Structured Brief", detail: "Contract brief + JSON for the pricing step" },
    ],
    integrations: [
      { name: "Salesforce", auth: "Bearer Token", actions: ["LIST_CONTRACT_DOCUMENTS — pull executed contract PDFs"] },
      { name: "LlamaParse", auth: "API Key", actions: ["PARSE_PDF — extract clean contract text"] },
    ],
  },
  "pricing": {
    name: "Pricing Agent",
    icon: Table2,
    description: "Splits the total price across each item in the bundle and builds the monthly revenue schedule on the Anaplan model",
    steps: [
      { label: "Load Contract Brief", detail: "Performance obligations and transaction price from the Reader" },
      { label: "Determine SSP", detail: "Standalone selling price per obligation (list price is rarely on the OS)" },
      { label: "Allocate Price", detail: "Split the bundle price across each obligation — runs on Anaplan" },
      { label: "Build Monthly Schedule", detail: "Which month each piece of revenue belongs in, across the term — runs on Anaplan" },
      { label: "Reconcile Totals", detail: "Allocation and monthly totals tie back to contract value" },
    ],
    integrations: [
      { name: "Anaplan MCP", auth: "Bearer Token", actions: ["RUN_ALLOCATION — SSP allocation", "RUN_SCHEDULE — monthly revenue schedule"] },
    ],
  },
  "anomaly": {
    name: "Anomaly Agent",
    icon: ShieldAlert,
    description: "Flags unusual terms — odd payment plans or rare promises — for a senior accountant instead of guessing",
    steps: [
      { label: "Compare vs Standard", detail: "Check terms against typical subscription + order-schedule patterns" },
      { label: "Detect Inconsistencies", detail: "OS terms conflicting with the SSA, non-standard milestones" },
      { label: "Score Severity", detail: "Critical / High / Medium / Low / Info" },
      { label: "Recommend Review", detail: "Route anything unusual to a senior accountant" },
      { label: "Emit Action Items", detail: "Follow-ups (e.g. email sales, request a document)" },
    ],
    integrations: [
      { name: "Email (SES)", auth: "SMTP", actions: ["SEND_EMAIL — notify the accounting team of a flagged contract"] },
    ],
  },
  "billing": {
    name: "Billing Agent",
    icon: Receipt,
    description: "Generates invoices and journal entries from the approved revenue plan, held for the Controller's sign-off before posting",
    steps: [
      { label: "Load Approved Plan", detail: "Allocation + monthly schedule approved at Gate 1" },
      { label: "Generate Invoices", detail: "Right amounts on the right dates across the billing cycle" },
      { label: "Draft Journal Entries", detail: "Booking rules — e.g. subscription recognized monthly" },
      { label: "Set Billing Dates", detail: "Update the billing plan so invoices go out on schedule" },
      { label: "Await Controller", detail: "Nothing posts to the books without human approval (Gate 2)" },
    ],
    integrations: [
      { name: "Salesforce / QuickBooks", auth: "Bearer Token", actions: ["PUSH_BILLING — send invoices to the billing system"] },
      { name: "Email (SES)", auth: "SMTP", actions: ["SEND_EMAIL — deliver invoices to the customer"] },
    ],
  },
};

const KNOWLEDGE_FILES = [
  "asc-606-overview.md", "anaplan-model-guide.md", "ssp-allocation-method.md",
  "revenue-schedule-rules.md", "journal-entry-templates.md", "billing-rules.md", "anomaly-playbook.md",
];

const WORKSPACE_FILES = [
  { name: "subscription-ssa.pdf", client: "samples" },
  { name: "bundled-order-schedule.pdf", client: "samples" },
];

const COMPLIANCE_RULES = [
  { label: "No journal entry posts without Controller approval", type: "guardrail" },
  { label: "Every figure traces to a contract line and calc step", type: "audit" },
  { label: "ASC 606 five-step allocation enforced", type: "regulation" },
  { label: "Unusual terms escalated to a senior accountant", type: "escalation" },
];

// TODO: Replace MOCK_FILE_CONTENT with real API calls to your file storage backend.
// Fetch file content from your API: GET /api/files?path=<filePath>
// Then render the markdown content in the prose-agent div below.
const MOCK_FILE_CONTENT: Record<string, string> = {
  "asc-606-overview.md": "# ASC 606 Overview\n\nConnect your file storage backend to load this document.\n\nReplace `MOCK_FILE_CONTENT` in `console/page.tsx` with a real `fetch` call to your files API.",
  "anaplan-model-guide.md": "# Anaplan Model Guide\n\nConnect your data backend to load the revenue-recognition model reference (workspace + model IDs, allocation and schedule tools).",
  "journal-entry-templates.md": "# Journal Entry Templates\n\nConnect your document storage to load the standard booking rules and JE templates.",
};

function DataFilePreview({ fileName, onClose }: { fileName: string; onClose: () => void }) {
  const wsFile = WORKSPACE_FILES.find((f) => f.name === fileName);
  const filePath = wsFile ? `workspace/${wsFile.client}/${fileName}` : `knowledge/docs/${fileName}`;
  const content = MOCK_FILE_CONTENT[fileName] ?? `# ${fileName}\n\nConnect your file storage backend to load this file.\n\nFile path: \`${filePath}\``;
  const isLoading = false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="glass-card rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-[560px] max-h-[65vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{fileName}</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/[0.04] rounded-lg text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <div className="prose-agent">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SkillJourneyPanel({ skillName, isActive }: { skillName: string; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const journey = SKILL_JOURNEYS[skillName];
  if (!journey) return null;
  const Icon = journey.icon;

  return (
    <div className={cn("rounded-xl border transition-all duration-200", isActive ? "border-primary/20 bg-primary/[0.04]" : "border-black/[0.04] bg-white/30")}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left">
        <div className={cn("p-1.5 rounded-lg", isActive ? "bg-primary/10" : "bg-black/[0.04]")}>
          <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("text-xs font-semibold block truncate", isActive ? "text-primary" : "text-foreground")}>{journey.name}</span>
          <span className="text-[10px] text-muted-foreground/60 block truncate">{journey.description.slice(0, 50)}...</span>
        </div>
        {isActive && <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform flex-shrink-0", expanded ? "rotate-0" : "-rotate-90")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 space-y-2.5">
              <div className="space-y-1">
                {journey.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold", isActive ? "border-primary/30 text-primary/60" : "border-black/[0.08] text-muted-foreground/40")}>
                        {i + 1}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-foreground block">{step.label}</span>
                      <span className="text-[10px] text-muted-foreground/60 block leading-snug">{step.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              {journey.integrations.length > 0 && (
                <div className="pt-2 border-t border-black/[0.04]">
                  <span className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Composio MCP Actions</span>
                  <div className="mt-1 space-y-1">
                    {journey.integrations.map((intg, i) => (
                      <div key={i} className="rounded-lg bg-black/[0.02] border border-black/[0.04] px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Plug className="w-2.5 h-2.5 text-success/60 flex-shrink-0" />
                          <span className="font-medium text-foreground">{intg.name}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <Lock className="w-2 h-2 text-muted-foreground/40" />
                          <span className="text-muted-foreground/50 text-[9px]">{intg.auth}</span>
                        </div>
                        {intg.actions.map((action, ai) => (
                          <div key={ai} className="text-[9px] text-muted-foreground/50 font-mono mt-0.5 pl-4">{action}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarSection({ title, icon: Icon, iconColor, count, children }: { title: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; count: number; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        <h4 className="text-xs font-semibold text-foreground flex-1 text-left">{title}</h4>
        <span className="text-[10px] font-normal text-muted-foreground">{count}</span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentConsole() {
  const { messages, setMessages, isStreaming, activeEvents, activeFiles, detectedSkills, detectedClient, sendMessage, stopStream, resetChat } = useChatStream();
  const { sessions, saveSession, deleteSession, clearAllSessions } = useChatHistory();
  const [input, setInput] = useState("");
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);
  const prevStreamingRef = useRef(false);
  const searchParams = useSearchParams();

  // Auto-save session when streaming finishes
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && messages.length > 0) {
      const id = saveSession(messages, activeSessionId ?? undefined);
      if (id && !activeSessionId) setActiveSessionId(id);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, messages, saveSession, activeSessionId]);

  const handleRestoreSession = useCallback(
    (session: ChatSession) => {
      if (!session) return;
      setMessages(session.messages);
      setActiveSessionId(session.id);
    },
    [setMessages]
  );

  const handleNewChat = useCallback(() => {
    // Save current conversation if it has messages
    if (messages.length > 0) {
      saveSession(messages, activeSessionId ?? undefined);
    }
    resetChat();
    setActiveSessionId(null);
  }, [messages, saveSession, activeSessionId, resetChat]);

  useEffect(() => {
    if (initialSentRef.current) return;
    const q = searchParams.get("q");
    if (q && q.trim()) {
      initialSentRef.current = true;
      setTimeout(() => sendMessage(q.trim()), 300);
    }
  }, [searchParams, sendMessage]);

  const quickActions = [
    { icon: FileText, title: "Summarize a contract", description: "Extract terms, pricing, and obligations from an SSA + order schedule", prompt: "Summarize the key revenue-recognition terms of this contract: what's being sold, the pricing, the term, and any special terms in the order schedule that override the SSA." },
    { icon: Table2, title: "Explain an allocation", description: "How the bundle price was split across performance obligations", prompt: "Explain how the transaction price was allocated across each performance obligation using standalone selling prices, and how the monthly revenue schedule was built." },
    { icon: ShieldAlert, title: "Check for unusual terms", description: "Flag anything that needs a senior accountant's review", prompt: "Review this contract for unusual terms — odd payment plans or rare obligations — that could affect revenue recognition and should be escalated." },
    { icon: Receipt, title: "Draft journal entries", description: "Generate the entries for the approved revenue schedule", prompt: "Draft the journal entries for this contract's monthly revenue schedule, following standard booking rules, ready for Controller approval." },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeEvents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    if (isStreaming) return;
    sendMessage(action);
  };

  const activeSkillNames = detectedSkills.length > 0 ? detectedSkills : Object.keys(SKILL_JOURNEYS);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <AnimatePresence>
        {previewFile && <DataFilePreview fileName={previewFile} onClose={() => setPreviewFile(null)} />}
      </AnimatePresence>

      <ChatHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions}
        onSelectSession={(session) => handleRestoreSession(session)}
        onDeleteSession={deleteSession}
        onClearAll={clearAllSessions}
        activeSessionId={activeSessionId}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-14 px-4 md:px-6 glass flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Revenue Recognition Agent</h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block animate-pulse" />
                {isStreaming ? "Processing..." : "Online & Ready"}
                {detectedClient && <span className="text-primary font-medium ml-1">· {detectedClient}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 hover:bg-black/[0.04] rounded-xl text-muted-foreground transition-colors flex items-center gap-1.5 group"
              title="Chat History"
            >
              <History className="w-4 h-4 group-hover:text-primary transition-colors" />
              <span className="text-[11px] font-medium hidden sm:inline group-hover:text-primary transition-colors">
                History
              </span>
            </button>
            <button onClick={handleNewChat} className="p-2 hover:bg-black/[0.04] rounded-xl text-muted-foreground transition-colors" title="New Chat">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-gradient-end flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">How can I help with revenue recognition?</h3>
              <p className="text-sm text-muted-foreground max-w-xl mt-2 mb-8 leading-relaxed">
                I can read contracts, allocate and schedule revenue on Anaplan, flag unusual terms, and draft journal entries — all held for your approval.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl w-full">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.title} onClick={() => handleQuickAction(action.prompt)} className="text-left p-4 rounded-xl glass-card transition-all group hover:scale-[1.02]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/[0.15] transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-foreground block mb-1">{action.title}</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg, msgIdx) => {
            const isLastAgent = msg.role === "agent" && msgIdx === messages.length - 1;
            const showPipelineForThis = isLastAgent && activeEvents.length > 0;
            return (
              <div key={msg.id}>
                <div className={cn("flex gap-3 max-w-5xl mx-auto w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "agent" && (
                    <div className="w-7 h-7 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/20 mt-1">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className="max-w-[90%] space-y-2.5">
                    {showPipelineForThis && <AgentPipelineStream events={activeEvents} isStreaming={isStreaming} />}
                    {msg.role === "user" ? (
                      <div className="rounded-xl px-4 py-3 bg-gradient-to-br from-primary to-primary-gradient-end text-white shadow-md shadow-primary/10">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : msg.content ? (
                      <div className="rounded-xl px-5 py-4 glass-card">
                        <div className="prose-agent">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-xl bg-black/[0.04] flex-shrink-0 flex items-center justify-center border border-black/[0.06] mt-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div className="flex gap-3 max-w-5xl mx-auto w-full">
              <div className="w-7 h-7 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/20 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="space-y-2.5 flex-1">
                <AgentPipelineStream events={activeEvents} isStreaming={isStreaming} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 md:px-6 py-3.5 glass">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-5xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a contract, allocation, schedule, or journal entry..."
              className="flex-1 glass-input rounded-xl px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/40"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button type="button" onClick={stopStream} className="p-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                <AlertCircle className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-gradient-end text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/10">
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="w-72 flex-shrink-0 glass-card border-l border-black/[0.04] overflow-y-auto p-4 space-y-5 hidden lg:block">
        <SidebarSection title="Agent Skills" icon={Zap} iconColor="text-primary" count={Object.keys(SKILL_JOURNEYS).length}>
          <div className="space-y-2">
            {Object.keys(SKILL_JOURNEYS).map((skill) => (
              <SkillJourneyPanel key={skill} skillName={skill} isActive={activeSkillNames.includes(skill)} />
            ))}
          </div>
        </SidebarSection>

        <SidebarSection title="Knowledge Base" icon={Database} iconColor="text-primary" count={KNOWLEDGE_FILES.length}>
          <div className="space-y-1">
            {KNOWLEDGE_FILES.map((file) => {
              const isActive = activeFiles.includes(file);
              return (
                <div key={file} onClick={() => setPreviewFile(file)} className={cn("flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer hover:border-primary/30", isActive ? "text-primary border-primary/20 bg-primary/[0.05] font-medium" : "text-muted-foreground border-black/[0.04] bg-white/20 hover:text-foreground")}>
                  <FileText className={cn("w-3 h-3 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground/40")} />
                  <span className="font-mono truncate text-[11px]">{file}</span>
                </div>
              );
            })}
          </div>
        </SidebarSection>

        <SidebarSection title="Sample Contracts" icon={FileStack} iconColor="text-warning" count={WORKSPACE_FILES.length}>
          <div className="space-y-1">
            {WORKSPACE_FILES.map((wsFile) => {
              const isActive = activeFiles.includes(wsFile.name);
              return (
                <div key={wsFile.name} onClick={() => setPreviewFile(wsFile.name)} className={cn("flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer hover:border-primary/30", isActive ? "text-primary border-primary/20 bg-primary/[0.05] font-medium" : "text-muted-foreground border-warning/30 bg-warning/[0.03] hover:text-foreground")}>
                  <FolderOpen className={cn("w-3 h-3 flex-shrink-0", isActive ? "text-primary" : "text-warning/40")} />
                  <span className="font-mono truncate text-[11px]">{wsFile.name}</span>
                </div>
              );
            })}
          </div>
        </SidebarSection>

        <SidebarSection title="Controls" icon={ShieldCheck} iconColor="text-warning" count={COMPLIANCE_RULES.length}>
          <div className="space-y-1">
            {COMPLIANCE_RULES.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground py-1">
                <AlertCircle className="w-3 h-3 text-warning flex-shrink-0 mt-0.5" />
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </SidebarSection>
      </div>
    </div>
  );
}

export default function ConsolePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground text-sm">Loading...</div>}>
      <AgentConsole />
    </Suspense>
  );
}
