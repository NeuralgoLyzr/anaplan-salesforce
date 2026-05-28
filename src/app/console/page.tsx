"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, Loader2, Play, Search, AlertCircle, RefreshCw,
  CheckCircle2, Zap, FileText, FolderOpen, ClipboardList,
  FileSearch, BarChart3, Sparkles, ChevronDown, ChevronRight,
  Database, Cpu, X, Plug, Layers, Lock, History,
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
  "survey-designer": {
    name: "Survey Designer",
    icon: ClipboardList,
    description: "Generates tailored employee benefit surveys based on engagement type and client context",
    steps: [
      { label: "Analyze Context", detail: "Determine engagement type, client industry, workforce demographics" },
      { label: "Define Dimensions", detail: "Awareness, Utilization, Satisfaction, Gaps, Trade-offs" },
      { label: "Generate Questions", detail: "15-25 questions with Likert scales, forced-rank, open-text" },
      { label: "Add Segmentation", detail: "Age, tenure, job family, location, coverage tier" },
      { label: "Format & Output", detail: "Structured survey with intro, section headers, response formats" },
    ],
    integrations: [
      { name: "Gmail", auth: "OAuth 2.0", actions: ["GMAIL_SEND_EMAIL — distribute survey to HR team"] },
      { name: "Google Sheets", auth: "OAuth 2.0", actions: ["GOOGLESHEETS_GET_SHEET_DATA — import responses"] },
    ],
  },
  "policy-analyzer": {
    name: "Policy Analyzer",
    icon: FileSearch,
    description: "Analyzes benefits policy documents and produces gap assessment with severity ratings",
    steps: [
      { label: "Extract Categories", detail: "Medical, Dental, Vision, Life, Disability, Retirement, HSA/FSA, PTO" },
      { label: "Assess Each Category", detail: "Competitiveness, plan design quality, cost sharing, compliance" },
      { label: "Benchmark vs Market", detail: "Compare to industry-benchmarks.md median data" },
      { label: "Flag Compliance Risks", detail: "ACA affordability, ERISA, SECURE 2.0, COBRA" },
      { label: "Produce Assessment", detail: "Strengths, gaps (Critical/Moderate/Minor), recommendations" },
    ],
    integrations: [
      { name: "Google Drive", auth: "OAuth 2.0", actions: ["GOOGLEDRIVE_LIST_FILES — pull policy docs from client Drive"] },
      { name: "Notion", auth: "OAuth 2.0", actions: ["NOTION_CREATE_PAGE — sync assessment to workspace"] },
    ],
  },
  "competitive-benchmarker": {
    name: "Competitive Benchmarker",
    icon: BarChart3,
    description: "Researches competitor benefits and builds comparison matrix showing market position",
    steps: [
      { label: "Identify Competitors", detail: "3-5 industry peers + cross-industry talent competitors" },
      { label: "Research Benefits", detail: "Medical, 401(k), PTO, parental leave, unique benefits" },
      { label: "Build Comparison Matrix", detail: "Client vs Competitor 1-3 vs Industry Median" },
      { label: "Calculate Position", detail: "Above/At/Below market for each benefit category" },
      { label: "Identify Trends", detail: "Emerging benefits competitors are adding" },
    ],
    integrations: [
      { name: "Perplexity", auth: "API Key", actions: ["PERPLEXITY_SEARCH — real-time web search for competitor data"] },
    ],
  },
  "synthesis-recommender": {
    name: "Synthesis & Recommend",
    icon: Sparkles,
    description: "Combines all workstream outputs into a client-ready recommendation report with 3 scenarios",
    steps: [
      { label: "Load All Workstreams", detail: "Survey results + Policy assessment + Competitive analysis" },
      { label: "Cross-Reference", detail: "Triple/Double/Single convergence point analysis" },
      { label: "Build 3 Scenarios", detail: "Conservative (cost-neutral), Moderate (5-15%), Aggressive (15-30%)" },
      { label: "Model by Persona", detail: "Early career, Mid-career with family, Pre-retirement" },
      { label: "Generate Report", detail: "Executive summary, data foundation, implementation roadmap" },
    ],
    integrations: [
      { name: "Perplexity", auth: "API Key", actions: ["PERPLEXITY_SEARCH — validate against latest market data"] },
      { name: "Gmail", auth: "OAuth 2.0", actions: ["GMAIL_SEND_EMAIL — send report to client stakeholders"] },
      { name: "Google Sheets", auth: "OAuth 2.0", actions: ["GOOGLESHEETS_CREATE_SPREADSHEET — export scenario data"] },
    ],
  },
};

const KNOWLEDGE_FILES = [
  "wtw-overview.md", "industry-benchmarks.md", "methodology-discovery.md",
  "methodology-design.md", "methodology-implementation.md", "methodology-measurement.md", "sample-policy.md",
];

const WORKSPACE_FILES = [
  { name: "engagement-brief.md", client: "meridian-manufacturing" },
  { name: "policy-assessment.md", client: "meridian-manufacturing" },
  { name: "employee-survey.md", client: "meridian-manufacturing" },
];

const COMPLIANCE_RULES = [
  { label: "Client data isolated per engagement", type: "guardrail" },
  { label: "No PII stored in agent memory — aggregates only", type: "privacy" },
  { label: "ERISA/ACA compliance flags on all recommendations", type: "regulation" },
  { label: "Actuarial certification required for plan cost models", type: "escalation" },
];

// TODO: Replace MOCK_FILE_CONTENT with real API calls to your file storage backend.
// Fetch file content from your API: GET /api/files?path=<filePath>
// Then render the markdown content in the prose-agent div below.
const MOCK_FILE_CONTENT: Record<string, string> = {
  "wtw-overview.md": "# Overview\n\nConnect your file storage backend to load this document.\n\nReplace `MOCK_FILE_CONTENT` in `console/page.tsx` with a real `fetch` call to your files API.",
  "industry-benchmarks.md": "# Industry Benchmarks\n\nConnect your data backend to load real benchmark data for your industry and use case.",
  "sample-policy.md": "# Sample Policy\n\nConnect your document storage to load real policy documents for analysis.",
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
    { icon: FileSearch, title: "Review Meridian Progress", description: "Check work status and what's pending for Meridian Manufacturing", prompt: "What's the current status of the Meridian Manufacturing engagement? What work has been completed and what still needs to be done?" },
    { icon: BarChart3, title: "Benchmark Meridian", description: "Competitive benchmarking against talent competitors", prompt: "Run a competitive benchmarking analysis for Meridian Manufacturing. Compare their benefits against Parker Hannifin, Emerson Electric, and other manufacturing competitors." },
    { icon: Sparkles, title: "Synthesize & Recommend", description: "Combine analysis into recommendation report", prompt: "Synthesize all completed Meridian Manufacturing workstreams into a recommendation report with three cost scenarios." },
    { icon: ClipboardList, title: "New Client Engagement", description: "Start a fresh total rewards engagement", prompt: "I'm starting a new total rewards engagement for a technology company with 8,000 employees based in Austin, TX. What's the best approach to start?" },
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
              <h2 className="font-semibold text-sm">Advisory Agent</h2>
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
              <h3 className="text-lg font-semibold text-foreground">How can I help with your engagement?</h3>
              <p className="text-sm text-muted-foreground max-w-xl mt-2 mb-8 leading-relaxed">
                I can design employee surveys, analyze benefits policies, benchmark against competitors, or synthesize recommendations.
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
              placeholder="Ask about benefits design, policy analysis, or competitive benchmarking..."
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
        <SidebarSection title="Skill Journeys" icon={Zap} iconColor="text-primary" count={Object.keys(SKILL_JOURNEYS).length}>
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

        <SidebarSection title="Meridian Workspace" icon={FolderOpen} iconColor="text-warning" count={WORKSPACE_FILES.length}>
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

        <SidebarSection title="Compliance" icon={AlertCircle} iconColor="text-warning" count={COMPLIANCE_RULES.length}>
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
