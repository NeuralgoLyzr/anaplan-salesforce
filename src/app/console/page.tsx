"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Play, Search, AlertCircle, RefreshCw, CheckCircle2, Zap, FileText, FolderOpen, ChevronDown, ChevronRight, Database, Cpu, Plug, Layers, History, Table2, ShieldAlert, Receipt, ShieldCheck,  } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStream, ChatEvent } from "@/hooks/use-chat-stream";
import { useChatHistory, type ChatSession } from "@/hooks/use-chat-history";
import { ChatHistoryDrawer } from "@/components/ui/chat-history-drawer";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Loader } from "@/components/ui/loader";
function FileContentScroll({ content }: { content: string }) {
  return (
    <div className="max-h-[90px] overflow-hidden rounded-[4px] bg-[#f0f1f7] border border-[#e6ebf8] px-3 py-2">
      <pre className="text-[0.75rem] font-mono text-[#485478] whitespace-pre-wrap leading-relaxed">{content}</pre>
    </div>
  );
}
function PipelineStepIcon({ type, isActive, isDone }: { type: string; isActive: boolean; isDone: boolean }) {
  const size = "w-3.5 h-3.5";
  if (isActive) return <Loader size="inline" />;
  if (isDone) return <CheckCircle2 className={`${size} text-[#3c67ea]`} />;
  switch (type) {
    case "phase": return <Layers className={`${size} text-[#3c67ea]`} />;
    case "skill_loading": return <Zap className={`${size} text-[#485478]`} />;
    case "skill_detect": return <Search className={`${size} text-[#485478]`} />;
    case "skill_execute": return <Play className={`${size} text-[#485478]`} />;
    case "skill_available": return <Zap className={`${size} text-[#485478]`} />;
    case "file_fetch": return <FileText className={`${size} text-[#485478]`} />;
    case "client_detect": return <FolderOpen className={`${size} text-[#485478]`} />;
    case "workspace_scan": return <FolderOpen className={`${size} text-[#485478]`} />;
    case "integration_check": return <Plug className={`${size} text-[#485478]`} />;
    case "pipeline_ready": return <CheckCircle2 className={`${size} text-[#3c67ea]`} />;
    case "pipeline_start": return <Cpu className={`${size} text-[#485478]`} />;
    case "llm_start": return <Bot className={`${size} text-[#3c67ea]`} />;
    case "system_read": return <FileText className={`${size} text-[#485478]`} />;
    case "tool_call": return <Database className={`${size} text-[#14a687]`} />;
    default: return <FolderOpen className={`${size} text-[#485478]`} />;
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
  if (evt.type === "tool_call") return "integration";
  if (["skill_loading", "skill_detect", "skill_execute", "skill_available"].includes(evt.type)) return "skill";
  if (evt.type === "file_fetch") return evt.meta?.category || "knowledge";
  if (["client_detect", "workspace_scan"].includes(evt.type)) return "workspace";
  if (evt.type === "integration_check") return "integration";
  if (["pipeline_ready", "llm_start"].includes(evt.type)) return "llm";
  return null;
}
const CATEGORY_BG: Record<string, string> = {
  config: "bg-[#f0f1f7]]",
  identity: "bg-[#f0f1f7]]",
  rules: "bg-[#f0f1f7]]",
  skill: "bg-[#f0f1f7]",
  knowledge: "bg-[#f0f1f7]]",
  workspace: "bg-white",
  integration: "bg-white",
  llm: "bg-[#f0f1f7]]",
};
function IntegrationStatusBadge({ status }: { status: string }) {
  if (status === "configured") return <span className="text-[0.75rem] font-medium text-[#14a687] border border-[#14a687] px-1 py-0 rounded-[2px] uppercase">ACTIVE</span>;
  if (status === "requires_setup") return <span className="text-[0.75rem] font-medium text-[#ffbb16] border border-[#ffbb16] px-1 py-0 rounded-[2px] uppercase">NEEDS SETUP</span>;
  return <span className="text-[0.75rem] font-medium text-[#485478] border border-[#e6ebf8] bg-[#f0f1f7] px-1 py-0 rounded-[2px] uppercase">AVAILABLE</span>;
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
  const skillEvents = events.filter((e) => e.type === "skill_loading");
  const fileEvents = events.filter((e) => e.type === "file_fetch");
  const toolEvents = events.filter((e) => e.type === "tool_call");
  const artifactEvents = events.filter((e) => e.type === "skill_execute");
  // Build an honest summary that reflects every kind of action — including tool
  // calls (e.g. live MongoDB queries) and artifacts, not just skills/files.
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const summaryParts: string[] = [];
  if (toolEvents.length) summaryParts.push(plural(toolEvents.length, "tool call", "tool calls"));
  if (skillEvents.length) summaryParts.push(`${plural(skillEvents.length, "skill", "skills")} read`);
  if (fileEvents.length) summaryParts.push(`${plural(fileEvents.length, "file", "files")} read`);
  if (artifactEvents.length) summaryParts.push(plural(artifactEvents.length, "artifact", "artifacts"));
  const summaryText = summaryParts.length ? summaryParts.join(" · ") : plural(pipelineEvents.length, "step", "steps");
  if (isDone && isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] px-4 py-2.5 cursor-pointer transition-colors"
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#3c67ea] flex-shrink-0" />
          <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Done · {summaryText}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#485478] ml-auto" />
        </div>
      </motion.div>
    );
  }
  return (
    <div className="space-y-0">
      {isDone && !isCollapsed && (
        <div className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setIsCollapsed(true)}>
          <ChevronDown className="w-3 h-3 text-[#485478]" />
          <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] tracking-[0.08em] font-medium">
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
                  <div className="h-px flex-1 bg-[#e6ebf8]" />
                  <span className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#3c67ea] px-2">
                    Phase {evt.meta?.phase}: {evt.meta?.name}
                  </span>
                  <div className="h-px flex-1 bg-[#e6ebf8]" />
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
                {!isLast && <div className="absolute left-[7px] top-[20px] bottom-0 w-px bg-[#f0f1f7]" />}
                <div className={cn("flex-shrink-0 mt-1 relative z-10 rounded-[4px] p-0.5", category ? CATEGORY_BG[category] : "")}>
                  <PipelineStepIcon type={evt.type} isActive={isActive} isDone={stepDone} />
                </div>
                <div className="flex-1 min-w-0 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[0.75rem] uppercase tracking-[0.08em] leading-[1.2]", isActive ? "text-[#242d48] font-medium" : "text-[#485478]")}>
                      {getStepLabel(evt)}
                    </span>
                    {evt.meta?.size && <span className="text-[0.75rem] text-[#485478] font-mono">{evt.meta.size}</span>}
                    {evt.type === "integration_check" && evt.meta?.status && <IntegrationStatusBadge status={evt.meta.status} />}
                    {evt.meta?.isPrimary === true && <span className="text-[0.75rem] font-medium text-[#3c67ea] border border-[#e6ebf8] bg-[#e6ebf8] px-1 py-0 rounded-[2px] uppercase">PRIMARY</span>}
                    {evt.meta?.isPrimary === false && evt.type === "skill_available" && (
                      <span className="text-[0.75rem] font-medium text-[#485478] bg-[#f0f1f7] px-1.5 py-0.5 rounded">STANDBY</span>
                    )}
                  </div>
                  {hasSteps && evt.type === "skill_loading" && (
                    <div className="mt-1.5 space-y-0.5">
                      {(evt.meta?.steps as string[]).slice(0, 3).map((step: string, si: number) => (
                        <div key={si} className="flex items-center gap-1.5 text-[0.75rem] text-[#485478]">
                          <span className="text-[#3c67ea]">{si + 1}.</span>
                          <span className="truncate">{step}</span>
                        </div>
                      ))}
                      {(evt.meta?.steps?.length ?? 0) > 3 && <span className="text-[0.75rem] text-[#485478]">+{(evt.meta?.steps?.length ?? 0) - 3} more steps</span>}
                    </div>
                  )}
                  {hasIntegrations && (
                    <div className="mt-1.5 space-y-0.5">
                      {(evt.meta?.integrations as { name: string; action: string }[]).map((intg, ii) => (
                        <div key={ii} className="flex items-center gap-1.5 text-[0.75rem] text-[#485478]">
                          <Plug className="w-2.5 h-2.5 text-[#14a687] flex-shrink-0" />
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
const COMPLIANCE_RULES = [
  { label: "No journal entry posts without Controller approval", type: "guardrail" },
  { label: "Every figure traces to a contract line and calc step", type: "audit" },
  { label: "ASC 606 five-step allocation enforced", type: "regulation" },
  { label: "Unusual terms escalated to a senior accountant", type: "escalation" },
];
function SidebarSection({ title, icon: Icon, iconColor, count, children }: { title: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; count: number; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        <h4 className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#242d48] flex-1 text-left">{title}</h4>
        <span className="text-[0.75rem] font-normal text-[#485478]">{count}</span>
        <ChevronDown className={cn("w-3 h-3 text-[#485478] transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
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
  const { messages, setMessages, isStreaming, activeEvents, activeFiles, detectedSkills, detectedClient, artifacts, sendMessage, stopStream, resetChat } = useChatStream();
  const { sessions, saveSession, deleteSession, clearAllSessions } = useChatHistory();
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [manifest, setManifest] = useState<{ skills: { id: string; name: string; description: string }[]; knowledge: string[] }>({ skills: [], knowledge: [] });
  const [openArtifact, setOpenArtifact] = useState<number>(0);
  // Load the agent's real skills + knowledge files (the version-controlled
  // gitagent repo) for the right rail.
  useEffect(() => {
    fetch("/api/agent/manifest")
      .then((r) => r.json())
      .then((d) => setManifest({ skills: d.skills ?? [], knowledge: d.knowledge ?? [] }))
      .catch(() => {});
  }, []);
  // Keep the latest artifact in focus as new ones stream in.
  useEffect(() => {
    if (artifacts.length > 0) setOpenArtifact(artifacts.length - 1);
  }, [artifacts.length]);
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
  return (
    <div className="flex h-full">
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
        <div className="h-14 px-4 md:px-6 bg-white border-b border-[#e6ebf8] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center border border-[#e6ebf8]">
              <Bot className="w-4 h-4 text-[#3c67ea]" />
            </div>
            <div>
              <h2 className="font-semibold text-[0.875rem] leading-[1.2]">Revenue Recognition Agent</h2>
              <p className="text-[0.75rem] text-[#485478] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14a687] inline-block" />
                {isStreaming ? "Processing..." : "Online & Ready"}
                {detectedClient && <span className="text-[#3c67ea] font-medium ml-1">· {detectedClient}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 hover:bg-[#f0f1f7] rounded-[4px] text-[#485478] transition-colors flex items-center gap-1.5 group"
              title="Chat History"
            >
              <History className="w-4 h-4 group-hover:text-[#3c67ea] transition-colors" />
              <span className="text-[0.75rem] font-medium hidden sm:inline group-hover:text-[#3c67ea] transition-colors">
                History
              </span>
            </button>
            <button onClick={handleNewChat} className="p-2 hover:bg-[#f0f1f7] rounded-[4px] text-[#485478] transition-colors" title="New Chat">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-[4px] bg-[#3c67ea] flex items-center justify-center mb-4 shadow-[0_2px_4px_rgba(36,45,72,0.15)] ">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-[1rem] leading-[1.2] font-semibold text-[#242d48]">How can I help with revenue recognition?</h3>
              <p className="text-[0.875rem] leading-[1.2] text-[#485478] max-w-xl mt-2 mb-8 leading-[1.2]">
                I can read contracts, allocate and schedule revenue on Anaplan, flag unusual terms, and draft journal entries — all held for your approval.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.title} onClick={() => handleQuickAction(action.prompt)} className="text-left p-4 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] transition-all group hover:scale-[1.02]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-[4px] bg-[#e6ebf8] text-[#3c67ea] group-hover:bg-[#f0f1f7]] transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#242d48] block mb-1">{action.title}</span>
                      <p className="text-[0.75rem] text-[#485478] leading-[1.2] line-clamp-2">{action.description}</p>
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
                    <div className="w-7 h-7 rounded-[4px] bg-[#e6ebf8] flex-shrink-0 flex items-center justify-center border border-[#e6ebf8] mt-1">
                      <Bot className="w-3.5 h-3.5 text-[#3c67ea]" />
                    </div>
                  )}
                  <div className="max-w-[90%] space-y-2.5">
                    {showPipelineForThis && <AgentPipelineStream events={activeEvents} isStreaming={isStreaming} />}
                    {msg.role === "user" ? (
                      <div className="rounded-[4px] px-4 py-3 bg-[#3c67ea] text-white ">
                        <p className="text-[0.875rem] leading-[1.2] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : msg.content ? (
                      <div className="rounded-[4px] px-5 py-4 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)]">
                        <div className="prose-agent">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-[4px] bg-[#f0f1f7] flex-shrink-0 flex items-center justify-center border border-[#e6ebf8] mt-1">
                      <User className="w-3.5 h-3.5 text-[#485478]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div className="flex gap-3 max-w-5xl mx-auto w-full">
              <div className="w-7 h-7 rounded-[4px] bg-[#e6ebf8] flex-shrink-0 flex items-center justify-center border border-[#e6ebf8] mt-1">
                <Bot className="w-3.5 h-3.5 text-[#3c67ea]" />
              </div>
              <div className="space-y-2.5 flex-1">
                <AgentPipelineStream events={activeEvents} isStreaming={isStreaming} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="px-4 md:px-6 py-3.5 bg-white border-b border-[#e6ebf8]">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-5xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a contract, allocation, schedule, or journal entry..."
              className="flex-1 bg-[#f8f8fa] shadow-[0_0_0_1px_#7885ab] rounded-[2px] rounded-[4px] px-4 py-3 text-[0.875rem] leading-[1.2] focus:outline-none placeholder:text-[#485478]"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button type="button" onClick={stopStream} className="p-3 rounded-[4px] bg-[#db3743] text-[#db3743]-foreground hover:bg-white transition-colors">
                <AlertCircle className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="p-3 rounded-[4px] bg-[#3c67ea] text-white hover:bg-[#1947ba] active:bg-[#0b2265] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ">
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
      {/* Artifacts panel — Claude-workspace style. Appears when the agent
          produces a deliverable via the create_artifact tool. */}
      {artifacts.length > 0 && (
        <div className="w-[420px] flex-shrink-0 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] border-l border-[#e6ebf8] flex flex-col hidden md:flex">
          <div className="h-12 px-4 flex items-center justify-between border-b border-[#e6ebf8]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#3c67ea]" />
              <span className="text-[0.875rem] leading-[1.2] font-semibold">Artifacts</span>
              <span className="text-[0.75rem] font-medium bg-[#e6ebf8] text-[#3c67ea] px-1 py-0 rounded-[2px] border border-[#e6ebf8]">{artifacts.length}</span>
            </div>
          </div>
          {artifacts.length > 1 && (
            <div className="flex gap-1 px-3 py-2 border-b border-[#e6ebf8] overflow-x-auto">
              {artifacts.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setOpenArtifact(i)}
                  className={cn(
                    "text-[0.75rem] font-medium px-4 py-2 rounded-[2px] whitespace-nowrap transition-colors",
                    i === openArtifact ? "bg-[#3c67ea] text-white" : "text-[#485478] hover:bg-[#f0f1f7]",
                  )}
                >
                  {a.title}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">
            {artifacts[openArtifact] && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#485478] bg-[#f0f1f7] px-1.5 py-0.5 rounded">
                    {artifacts[openArtifact].kind}
                  </span>
                  <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{artifacts[openArtifact].title}</h3>
                </div>
                <div className="prose-agent">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifacts[openArtifact].content}</ReactMarkdown>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="w-72 flex-shrink-0 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] border-l border-[#e6ebf8] overflow-y-auto p-4 space-y-5 hidden lg:block">
        <SidebarSection title="Agent Skills" icon={Zap} iconColor="text-[#3c67ea]" count={manifest.skills.length}>
          <div className="space-y-1.5">
            {manifest.skills.map((skill) => {
              const isActive = detectedSkills.includes(skill.id);
              return (
                <div
                  key={skill.id}
                  title={skill.description}
                  className={cn(
                    "px-3 py-2 rounded-[4px] border transition-all",
                    isActive
                      ? "text-[#3c67ea] border-[#e6ebf8] bg-[#f0f1f7]] font-medium shadow-[0_2px_4px_rgba(36,45,72,0.15)]"
                      : "text-[#485478] border-[#e6ebf8] bg-[#f0f1f7]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isActive ? <CheckCircle2 className="w-3 h-3 text-[#3c67ea] flex-shrink-0" /> : <Zap className="w-3 h-3 text-[#485478] flex-shrink-0" />}
                    <span className="font-mono text-[0.75rem] truncate">{skill.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SidebarSection>
        <SidebarSection title="Knowledge Base" icon={Database} iconColor="text-[#3c67ea]" count={manifest.knowledge.length}>
          <div className="space-y-1">
            {manifest.knowledge.map((file) => {
              const isActive = activeFiles.includes(file);
              return (
                <div key={file} className={cn("flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.08em] px-3 py-2 rounded-[4px] border transition-all", isActive ? "text-[#3c67ea] border-[#e6ebf8] bg-[#f0f1f7]] font-medium" : "text-[#485478] border-[#e6ebf8] bg-[#f0f1f7]")}>
                  <FileText className={cn("w-3 h-3 flex-shrink-0", isActive ? "text-[#3c67ea]" : "text-[#485478]")} />
                  <span className="font-mono truncate text-[0.75rem]">{file}</span>
                </div>
              );
            })}
          </div>
        </SidebarSection>
        <SidebarSection title="Controls" icon={ShieldCheck} iconColor="text-[#ffbb16]" count={COMPLIANCE_RULES.length}>
          <div className="space-y-1">
            {COMPLIANCE_RULES.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-[0.75rem] text-[#485478] py-1">
                <AlertCircle className="w-3 h-3 text-[#ffbb16] flex-shrink-0 mt-0.5" />
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
    <Suspense fallback={<div className="flex h-full items-center justify-center text-[#485478] text-[0.875rem] leading-[1.2]">Loading...</div>}>
      <AgentConsole />
    </Suspense>
  );
}
