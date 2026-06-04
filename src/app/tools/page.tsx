"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plug, ExternalLink, Zap, Shield, Lock, Key, CheckCircle2, AlertCircle, Clock, ChevronDown, Search, Globe, ArrowRight, X,  } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnabledIntegrations } from "@/hooks/use-enabled-integrations";
import { Loader } from "@/components/ui/loader";
/* ─── Types ──────────────────────────────────────────────── */
type Status = "connected" | "pending" | "requires_setup" | "available";
interface ReadyTool {
  id: string;
  name: string;
  logo: string;
  category: string;
  description: string;
  authType: "oauth2" | "api_key" | "oauth2_or_api_key";
  authNote: string;
  scopes: string[];
  actions: string[];
  docsUrl: string;
  status?: Status;
}
/* ─── Ready Tools Data ───────────────────────────────────── */
const READY_TOOLS: ReadyTool[] = [
  {
    id: "calendly",
    name: "Calendly",
    logo: "https://cdn.simpleicons.org/calendly/006BFF",
    category: "scheduling",
    description: "Automate scheduling workflows — create booking links, sync invitee details, and send smart reminders without back-and-forth.",
    authType: "oauth2_or_api_key",
    authNote: "API key or OAuth via Calendly",
    scopes: [],
    actions: [
      "Create and share booking links",
      "Retrieve user schedules and availability",
      "Sync invitee details into your workflow",
      "Send automated scheduling reminders",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/calendly.md",
  },
  {
    id: "clickup",
    name: "ClickUp",
    logo: "https://cdn.simpleicons.org/clickup/7B68EE",
    category: "productivity",
    description: "Manage tasks, projects, and team workloads — create tasks, set priorities, assign to team members, and track progress programmatically.",
    authType: "api_key",
    authNote: "Personal API token or team key",
    scopes: [],
    actions: [
      "Create and update tasks",
      "Set due dates and priorities",
      "Assign tasks to team members",
      "Fetch task progress and status",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/clickup.md",
  },
  {
    id: "discord",
    name: "Discord",
    logo: "https://cdn.simpleicons.org/discord/5865F2",
    category: "communication",
    description: "Send messages, moderate channels, summarize threads, and trigger agent workflows from any Discord server.",
    authType: "oauth2",
    authNote: "Bot token with server permissions",
    scopes: ["Read Messages", "Send Messages", "Manage Webhooks"],
    actions: [
      "Send and read channel messages",
      "Summarize conversation threads",
      "Moderate and manage channels",
      "Trigger workflows from Discord events",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/discord.md",
  },
  {
    id: "github",
    name: "GitHub",
    logo: "https://cdn.simpleicons.org/github/181717",
    category: "development",
    description: "Interact with repositories, issues, and pull requests — monitor commits, manage webhooks, and automate code-related workflows.",
    authType: "oauth2",
    authNote: "GitHub OAuth",
    scopes: ["repo", "workflow", "read:user"],
    actions: [
      "Read and update repositories",
      "Create and manage issues & PRs",
      "Monitor commits and branches",
      "Set up and manage webhooks",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/github.md",
  },
  {
    id: "gmail",
    name: "Gmail",
    logo: "https://cdn.simpleicons.org/gmail/EA4335",
    category: "communication",
    description: "Compose, send, read, and search emails. Attach files and automate email-based workflows with full inbox access.",
    authType: "oauth2",
    authNote: "Google OAuth",
    scopes: ["gmail.readonly", "gmail.send", "gmail.compose"],
    actions: [
      "Compose and send emails",
      "Read and search inbox",
      "Attach and manage files",
      "Filter and label messages",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/gmail.md",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    logo: "https://cdn.simpleicons.org/googlecalendar/4285F4",
    category: "scheduling",
    description: "Create and update events, check availability, and manage recurring meetings across Google Calendar accounts.",
    authType: "oauth2",
    authNote: "Google OAuth",
    scopes: ["calendar.readonly", "calendar.events"],
    actions: [
      "Create and update calendar events",
      "Check user availability",
      "Manage recurring events",
      "Send event invitations",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/googlecalender.md",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    logo: "https://cdn.simpleicons.org/googledrive/4285F4",
    category: "storage",
    description: "Access, read, and upload files across Docs, Sheets, and PDFs. Use Drive as live memory for your agents.",
    authType: "oauth2",
    authNote: "Google OAuth with file scopes",
    scopes: ["drive.readonly", "drive.file", "drive.metadata.readonly"],
    actions: [
      "List and access files & folders",
      "Read Docs, Sheets, and PDFs",
      "Upload and update files",
      "Use Drive as persistent agent memory",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/googledrive.md",
  },
  {
    id: "google-tasks",
    name: "Google Tasks",
    logo: "https://cdn.simpleicons.org/googletasks/0B8043",
    category: "productivity",
    description: "Add, remove, and manage tasks with due dates, priorities, and nested subtasks across any Google Task list.",
    authType: "oauth2",
    authNote: "Google OAuth",
    scopes: ["tasks", "tasks.readonly"],
    actions: [
      "Add and remove tasks",
      "Set due dates and priorities",
      "Create nested subtasks",
      "Set and manage task reminders",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/googletasks.md",
  },
  {
    id: "notion",
    name: "Notion",
    logo: "https://cdn.simpleicons.org/notion/000000",
    category: "productivity",
    description: "Read and summarize pages, create and update databases, and extract structured data from any Notion workspace.",
    authType: "api_key",
    authNote: "Notion API token (personal or workspace)",
    scopes: [],
    actions: [
      "Read and summarize pages",
      "Create and update pages",
      "Query and update databases",
      "Extract structured data from blocks",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/notion.md",
  },
  {
    id: "outlook",
    name: "Outlook",
    logo: "https://cdn.simpleicons.org/microsoftoutlook/0078D4",
    category: "communication",
    description: "Send and receive emails, filter inbox, and create calendar events — all via Microsoft Graph API.",
    authType: "oauth2",
    authNote: "Azure AD OAuth (Microsoft Graph)",
    scopes: ["mail.read", "mail.send", "calendars.readwrite"],
    actions: [
      "Send and receive emails",
      "Filter and search inbox",
      "Create calendar events",
      "Manage contacts and folders",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/outlook.md",
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    logo: "https://cdn.simpleicons.org/perplexity/1FB8CD",
    category: "ai",
    description: "Get real-time, web-sourced answers with citations. Give agents the ability to search and reason over live web content.",
    authType: "api_key",
    authNote: "Perplexity API key",
    scopes: [],
    actions: [
      "Real-time web search with citations",
      "Answer complex research questions",
      "Summarize live web content",
      "Source attribution for all answers",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/perplexity.md",
  },
  {
    id: "slack",
    name: "Slack",
    logo: "https://cdn.simpleicons.org/slack/4A154B",
    category: "communication",
    description: "Post messages, send DMs, summarize threads, and listen for triggers from any Slack workspace.",
    authType: "oauth2",
    authNote: "Slack App credentials",
    scopes: ["channels:read", "chat:write", "im:write", "channels:history"],
    actions: [
      "Post messages to channels",
      "Send direct messages",
      "Summarize threads",
      "Listen for triggers and mentions",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/slack.md",
  },
  {
    id: "spotify",
    name: "Spotify",
    logo: "https://cdn.simpleicons.org/spotify/1DB954",
    category: "media",
    description: "Control playback, access playlists, search tracks, and create or update playlists programmatically.",
    authType: "oauth2",
    authNote: "Spotify OAuth",
    scopes: ["user-read-private", "user-library-read", "user-modify-playback-state", "playlist-modify-public"],
    actions: [
      "Play, pause, skip, and resume tracks",
      "Access playlists and liked songs",
      "Search tracks and artists",
      "Create and update playlists",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/spotify.md",
  },
  {
    id: "twitter",
    name: "Twitter (X)",
    logo: "https://cdn.simpleicons.org/x/000000",
    category: "communication",
    description: "Post tweets, monitor hashtags and mentions, retrieve thread engagement, and auto-respond to DMs.",
    authType: "oauth2",
    authNote: "Twitter Developer v2 tokens",
    scopes: ["tweet.read", "tweet.write", "dm.read", "dm.write"],
    actions: [
      "Post tweets and replies",
      "Retrieve thread engagement",
      "Monitor hashtags and mentions",
      "Auto-respond to DMs",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/twitter.md",
  },
  {
    id: "youtube",
    name: "YouTube",
    logo: "https://cdn.simpleicons.org/youtube/FF0000",
    category: "media",
    description: "Search videos, fetch metadata (views, likes, comments), retrieve captions, and schedule content publishing.",
    authType: "oauth2_or_api_key",
    authNote: "YouTube Data API key or OAuth (Data API v3)",
    scopes: ["youtube.readonly", "youtube.upload", "youtube.force-ssl"],
    actions: [
      "Search and discover videos",
      "Fetch video metadata and analytics",
      "Retrieve captions and transcripts",
      "Schedule content publishing",
    ],
    docsUrl: "https://docs.lyzr.ai/agent-lab/tools/ready/youtube.md",
  },
];
/* ─── Category config ────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",           label: "All",            count: READY_TOOLS.length },
  { id: "communication", label: "Communication",  count: READY_TOOLS.filter(t => t.category === "communication").length },
  { id: "productivity",  label: "Productivity",   count: READY_TOOLS.filter(t => t.category === "productivity").length  },
  { id: "scheduling",    label: "Scheduling",     count: READY_TOOLS.filter(t => t.category === "scheduling").length    },
  { id: "development",   label: "Development",    count: READY_TOOLS.filter(t => t.category === "development").length   },
  { id: "storage",       label: "Storage",        count: READY_TOOLS.filter(t => t.category === "storage").length       },
  { id: "media",         label: "Media",          count: READY_TOOLS.filter(t => t.category === "media").length         },
  { id: "ai",            label: "AI & Research",  count: READY_TOOLS.filter(t => t.category === "ai").length            },
];
const CATEGORY_COLORS: Record<string, string> = {
  communication: "text-[#3c67ea] bg-[#f0f1f7] border-[#e6ebf8]",
  productivity:  "text-[#3c67ea] bg-[#f0f1f7] border-[#e6ebf8]",
  scheduling:    "text-[#ffbb16] bg-white border-[#ffbb16]",
  development:   "text-[#485478] bg-[#f0f1f7] border-[#e6ebf8]",
  storage:       "text-[#14a687] bg-white border-[#14a687]",
  media:         "text-[#db3743] bg-white border-[#db3743]",
  ai:            "text-[#3c67ea] bg-[#f0f1f7] border-[#e6ebf8]",
};
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  connected:      { label: "Connected",     color: "text-[#14a687]",          bg: "bg-white",     icon: CheckCircle2 },
  pending:        { label: "Pending",       color: "text-[#3c67ea]",          bg: "bg-[#f0f1f7]",    icon: Clock       },
  requires_setup: { label: "Setup needed",  color: "text-[#ffbb16]",           bg: "bg-white",     icon: AlertCircle },
  available:      { label: "Available",     color: "text-[#485478]",  bg: "bg-[#f0f1f7]",   icon: Zap         },
};
const AUTH_LABEL: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  oauth2:             { label: "OAuth 2.0",           icon: Lock },
  api_key:            { label: "API Key",             icon: Key  },
  oauth2_or_api_key:  { label: "OAuth 2.0 / API Key", icon: Lock },
};
/* ─── Logo ───────────────────────────────────────────────── */
function ToolLogo({ tool }: { tool: ReadyTool }) {
  const [err, setErr] = useState(false);
  return (
    <div className="w-11 h-11 rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex items-center justify-center flex-shrink-0 bg-white">
      {!err
        ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tool.logo} alt={tool.name} className="w-6 h-6 object-contain"
               onError={() => setErr(true)} />
        )
        : <Globe className="w-5 h-5 text-[#485478]" />
      }
    </div>
  );
}
/* ─── Integration Card ───────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(); }}
      title={on ? "Disable integration" : "Enable integration"}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-[4px] transition-colors duration-200 focus:outline-none",
        on ? "bg-[#3c67ea]" : "bg-[#f0f1f7]"
      )}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 transform rounded-[2px] bg-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] transition-transform duration-200",
        on ? "translate-x-4" : "translate-x-0.5"
      )} />
    </button>
  );
}
function IntegrationCard({
  tool, isExpanded, onToggle, onConnect, connecting, enabled, onEnableToggle,
}: {
  tool: ReadyTool;
  isExpanded: boolean;
  onToggle: () => void;
  onConnect: (id: string) => void;
  connecting: string | null;
  enabled: boolean;
  onEnableToggle: (id: string) => void;
}) {
  const status    = tool.status ?? "available";
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;
  const authCfg   = AUTH_LABEL[tool.authType];
  const AuthIcon  = authCfg.icon;
  const catColor  = CATEGORY_COLORS[tool.category] ?? "text-[#485478] bg-[#f0f1f7] border-transparent";
  const isConnected = status === "connected";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[4px] transition-all duration-200 bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden",
        enabled           && "ring-2 ring-primary/30 bg-[#f0f1f7]]",
        isConnected       && "ring-1 ring-success/20",
        status === "pending" && "ring-1 ring-primary/15",
        isExpanded && !enabled && "ring-1 ring-primary/20",
      )}
    >
      {/* ── Card header (always visible) ── */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && onToggle()}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-[#f0f1f7] transition-colors cursor-pointer"
      >
        <ToolLogo tool={tool} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48]">{tool.name}</h3>
            <span className={cn(
              "text-[0.75rem] font-semibold px-2 py-0.5 rounded-[2px] border flex items-center gap-1",
              statusCfg.color, statusCfg.bg
            )}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusCfg.label}
            </span>
          </div>
          <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] leading-[1.2] line-clamp-2 mb-2.5">
            {tool.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[0.75rem] font-medium px-2 py-0.5 rounded-[2px] border uppercase", catColor)}>
              {tool.category === "ai" ? "AI & Research" : tool.category}
            </span>
            <span className="flex items-center gap-1 text-[0.75rem] text-[#485478]">
              <AuthIcon className="w-2.5 h-2.5" />
              {authCfg.label}
            </span>
            <span className="text-[0.75rem] text-[#485478]">
              {tool.actions.length} actions
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
          <Toggle on={enabled} onChange={() => onEnableToggle(tool.id)} />
          {enabled && (
            <span className="text-[0.75rem] font-semibold text-[#3c67ea] whitespace-nowrap">
              On Dashboard
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-[#485478] flex-shrink-0 mt-0.5 transition-transform duration-200",
          isExpanded && "rotate-180"
        )} />
      </div>
      {/* ── Expanded detail panel ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[#e6ebf8]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                {/* Actions */}
                <div>
                  <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-2.5">
                    What this tool can do
                  </p>
                  <ul className="space-y-1.5">
                    {tool.actions.map(action => (
                      <li key={action} className="flex items-start gap-2 text-[0.75rem] uppercase tracking-[0.08em] text-[#242d48]">
                        <span className="w-4 h-4 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3c67ea] block" />
                        </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Auth & permissions */}
                <div>
                  <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-2.5">
                    Auth & Permissions
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.08em]">
                      <AuthIcon className="w-3.5 h-3.5 text-[#485478] flex-shrink-0" />
                      <span className="text-[#242d48] font-medium">{authCfg.label}</span>
                    </div>
                    <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">{tool.authNote}</p>
                    {tool.scopes.length > 0 && (
                      <div className="pt-1">
                        <p className="text-[0.75rem] font-medium text-[#485478] mb-1.5">Required scopes</p>
                        <div className="flex flex-wrap gap-1">
                          {tool.scopes.map(scope => (
                            <span key={scope}
                              className="text-[0.75rem] font-mono text-[#485478] bg-[#f0f1f7] px-1.5 py-0.5 rounded border border-[#e6ebf8]">
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Action row */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#e6ebf8]">
                {isConnected ? (
                  <span className="flex items-center gap-1.5 text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#14a687]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected and ready to use
                  </span>
                ) : (
                  <button
                    onClick={() => onConnect(tool.id)}
                    disabled={connecting === tool.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#3c67ea] text-white text-[0.75rem] uppercase tracking-[0.08em] font-semibold rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {connecting === tool.id
                      ? <Loader size="inline" />
                      : <Plug className="w-3.5 h-3.5" />
                    }
                    {connecting === tool.id ? "Connecting…" : "Connect Integration"}
                  </button>
                )}
                <a
                  href={tool.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] hover:text-[#242d48] transition-colors ml-auto"
                >
                  View Docs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
/* ─── Page ───────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const [category,   setCategory]   = useState("all");
  const [search,     setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  // TODO: Replace with real status fetched from your integrations backend
  const [liveStatus] = useState<Record<string, Status>>({});
  const composioOk = false;
  const { isEnabled, toggle: toggleEnabled, enabledList } = useEnabledIntegrations();
  // TODO: Replace with your OAuth/API-key connection flow
  // POST to your backend with { appName: id } and redirect to the OAuth URL returned
  async function handleConnect(id: string) {
    setConnecting(id);
    // Simulate brief loading, then clear
    await new Promise(r => setTimeout(r, 800));
    setConnecting(null);
  }
  // Merge live status into static tools
  const tools: ReadyTool[] = READY_TOOLS.map(t => ({
    ...t,
    status: liveStatus[t.id] ?? "available",
  }));
  // Filter
  const filtered = tools.filter(t => {
    const matchCat  = category === "all" || t.category === category;
    const q         = search.toLowerCase();
    const matchSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.actions.some(a => a.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });
  const connectedCount = tools.filter(t => t.status === "connected").length;
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Plug className="w-6 h-6 text-[#3c67ea]" />
            <h1 className="text-[1.375rem] leading-[1.5] font-semibold text-[#242d48]">Integrations</h1>
            {composioOk && (
              <span className="flex items-center gap-1 text-[0.75rem] font-medium text-[#14a687] bg-white px-2 py-0.5 rounded-[2px]">
                <CheckCircle2 className="w-2.5 h-2.5" /> Composio Connected
              </span>
            )}
          </div>
          <p className="text-[0.875rem] leading-[1.2] text-[#485478]">
            Connect tools to your agents — {tools.length} ready-to-use integrations
            {enabledList.length > 0 && (
              <span className="ml-2 text-[0.75rem] font-semibold text-[#3c67ea] bg-[#f0f1f7] px-1.5 py-0.5 rounded-[2px]">
                {enabledList.length} shown on Dashboard
              </span>
            )}
          </p>
        </div>
      </div>
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Tools",   value: tools.length,      icon: Plug,          color: "text-[#3c67ea]",     bg: "bg-[#f0f1f7]"   },
          { label: "Connected",     value: connectedCount,    icon: CheckCircle2,  color: "text-[#14a687]",     bg: "bg-white"   },
          { label: "Auth Types",    value: "OAuth + API Key", icon: Lock,          color: "text-[#3c67ea]",     bg: "bg-[#f0f1f7]"   },
          { label: "Categories",    value: CATEGORIES.length - 1, icon: Shield,    color: "text-[#3c67ea]",     bg: "bg-[#f0f1f7]"   },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("p-1.5 rounded-[4px]", s.bg)}>
                  <Icon className={cn("w-3.5 h-3.5", s.color)} />
                </div>
                <span className="text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#485478]">{s.label}</span>
              </div>
              <p className="text-[1rem] leading-[1.2] font-semibold text-[#242d48]">{s.value}</p>
            </div>
          );
        })}
      </div>
      {/* ── How it works banner ── */}
      <div className="phase-context-banner rounded-[4px] p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#3c67ea] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] mb-2">How integrations work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { step: "1", title: "Connect",  body: "Authorize via OAuth or paste an API key. Credentials are stored securely — never exposed to agents." },
                { step: "2", title: "Compose",  body: "Add the tool to any agent skill. The agent calls it by name — no extra code needed." },
                { step: "3", title: "Execute",  body: "At runtime, Composio handles token refresh, rate limits, and API calls on behalf of your agent." },
              ].map(s => (
                <div key={s.step} className="bg-white rounded-[4px] p-3 border border-[#e6ebf8]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center text-[0.75rem] font-semibold text-[#3c67ea]">{s.step}</span>
                    <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#242d48]">{s.title}</span>
                  </div>
                  <p className="text-[0.75rem] text-[#485478] leading-[1.2]">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* ── Search + category filter ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#485478] pointer-events-none" />
          <input
            type="text"
            placeholder="Search tools, actions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#f8f8fa] border-2 border-dotted border-transparent shadow-[0_0_0_1px_#7885ab] focus:border-[#485478] focus:shadow-none rounded-[4px] pl-8 pr-8 py-2 text-[0.75rem] uppercase tracking-[0.08em] text-[#242d48] placeholder:text-[#485478] outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#485478] hover:text-[#242d48]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Category tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-[4px] text-[0.75rem] uppercase tracking-[0.08em] font-medium transition-colors whitespace-nowrap",
                category === cat.id
                  ? "bg-[#3c67ea] text-white"
                  : "bg-[#f0f1f7] text-[#485478] hover:text-[#242d48]"
              )}
            >
              {cat.label}
              <span className={cn(
                "ml-1.5 text-[0.75rem]",
                category === cat.id ? "text-white/70" : "text-[#485478]"
              )}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* ── Results count ── */}
      <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478] mb-3">
        {filtered.length === tools.length
          ? `${tools.length} integrations`
          : `${filtered.length} of ${tools.length} integrations`}
        {search && <span className="ml-1">matching &ldquo;{search}&rdquo;</span>}
      </p>
      {/* ── Tool grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filtered.map(tool => (
            <IntegrationCard
              key={tool.id}
              tool={tool}
              isExpanded={expandedId === tool.id}
              onToggle={() => setExpandedId(expandedId === tool.id ? null : tool.id)}
              onConnect={handleConnect}
              connecting={connecting}
              enabled={isEnabled(tool.id)}
              onEnableToggle={toggleEnabled}
            />
          ))}
        </AnimatePresence>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#485478]">
          <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-[0.875rem] leading-[1.2] font-medium">No integrations found</p>
          <p className="text-[0.75rem] uppercase tracking-[0.08em] mt-1">Try a different search or category</p>
          <button onClick={() => { setSearch(""); setCategory("all"); }}
            className="mt-4 text-[0.75rem] uppercase tracking-[0.08em] font-medium text-[#3c67ea] hover:underline flex items-center gap-1 mx-auto">
            Clear filters <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
      {/* ── Connecting overlay ── */}
      <AnimatePresence>
        {connecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#f0f1f7] flex items-center justify-center z-50"
          >
            <div className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] rounded-[4px] p-8 max-w-sm mx-auto text-center shadow-[0_2px_4px_rgba(36,45,72,0.15)]">
              <Loader size="medium" className="mx-auto mb-3" />
              <p className="text-[0.875rem] leading-[1.2] font-semibold text-[#242d48] mb-1">
                Connecting {READY_TOOLS.find(t => t.id === connecting)?.name ?? connecting}…
              </p>
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-[#485478]">Preparing the OAuth flow via Composio</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
