"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageSquare,
  Trash2,
  Clock,
  MessagesSquare,
  AlertCircle,
} from "lucide-react";
import type { ChatSession } from "@/hooks/use-chat-history";
import { cn } from "@/lib/utils";

/* ──────────────────────────────── helpers ──────────────────────────────── */

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function chatPreview(session: ChatSession): string {
  const lastAgent = [...session.messages]
    .reverse()
    .find((m) => m.role === "agent");
  if (!lastAgent?.content) return "No response yet";
  const text = lastAgent.content.replace(/[#*_`>]/g, "").trim();
  return text.length > 90 ? text.slice(0, 87) + "…" : text;
}

/* ──────────────────────────────── types ────────────────────────────────── */

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  activeSessionId?: string | null;
}

/* ─────────────────── ChatHistoryItem (reusable row) ───────────────────── */

function ChatHistoryItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const messageCount = session.messages.filter(
    (m) => m.role === "user"
  ).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group relative rounded-xl border transition-all duration-200 cursor-pointer",
        isActive
          ? "border-primary/25 bg-primary/[0.06] shadow-sm shadow-primary/10"
          : "border-black/[0.05] dark:border-white/[0.05] bg-white/40 dark:bg-black/20 hover:border-primary/15 hover:bg-white/60 hover:shadow-sm"
      )}
      onClick={onSelect}
    >
      <div className="px-3.5 py-3 flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 mt-0.5 p-1.5 rounded-lg transition-colors",
            isActive ? "bg-primary/10" : "bg-black/[0.04] group-hover:bg-primary/[0.06]"
          )}
        >
          <MessageSquare
            className={cn(
              "w-3.5 h-3.5",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                "text-xs font-semibold truncate block flex-1",
                isActive ? "text-primary" : "text-foreground"
              )}
            >
              {session.title}
            </span>
            {isActive && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
            )}
          </div>

          <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed mb-1.5">
            {chatPreview(session)}
          </p>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(session.updatedAt)}
            </span>
            <span className="flex items-center gap-1">
              <MessagesSquare className="w-2.5 h-2.5" />
              {messageCount} {messageCount === 1 ? "message" : "messages"}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "flex-shrink-0 p-1.5 rounded-lg transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
            "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
          )}
          title="Delete chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ──────────────────── ConfirmClearModal (reusable) ─────────────────────── */

function ConfirmClearModal({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="glass-card rounded-xl p-5 mx-4 max-w-[260px] text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Clear All History?
            </h4>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              This will permanently delete all saved chat sessions. This action
              cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-black/[0.08] text-muted-foreground hover:bg-black/[0.03] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Delete All
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────── EmptyState (reusable) ─────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
      <div className="w-14 h-14 rounded-2xl bg-primary/[0.06] flex items-center justify-center mb-4">
        <MessagesSquare className="w-6 h-6 text-primary/40" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1.5">
        No Chat History
      </h4>
      <p className="text-xs text-muted-foreground/60 max-w-[200px] leading-relaxed">
        Your conversations will appear here once you start chatting with the
        agent.
      </p>
    </div>
  );
}

/* ──────────────────── ChatHistoryDrawer (main) ────────────────────────── */

import { useState } from "react";

export function ChatHistoryDrawer({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onDeleteSession,
  onClearAll,
  activeSessionId,
}: ChatHistoryDrawerProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    onClearAll();
    setConfirmClear(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[340px] max-w-[85vw] flex flex-col"
            style={{
              background: "hsl(var(--background) / 0.95)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              borderRight: "1px solid hsl(var(--border) / 0.5)",
              boxShadow: "4px 0 40px rgba(0, 0, 0, 0.08)",
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <MessagesSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Chat History
                  </h3>
                  <span className="text-[10px] text-muted-foreground/60">
                    {sessions.length}{" "}
                    {sessions.length === 1 ? "conversation" : "conversations"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {sessions.length > 0 && (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="px-2.5 py-1.5 text-[10px] font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/[0.06] rounded-lg transition-all"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-black/[0.05] rounded-lg text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 relative">
              {sessions.length === 0 ? (
                <EmptyState />
              ) : (
                <AnimatePresence mode="popLayout">
                  {sessions.map((session) => (
                    <ChatHistoryItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => {
                        onSelectSession(session);
                        onClose();
                      }}
                      onDelete={() => onDeleteSession(session.id)}
                    />
                  ))}
                </AnimatePresence>
              )}

              {/* Confirm clear overlay */}
              <ConfirmClearModal
                isOpen={confirmClear}
                onConfirm={handleClearAll}
                onCancel={() => setConfirmClear(false)}
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-black/[0.06]">
              <p className="text-[10px] text-muted-foreground/40 text-center">
                History is stored locally in your browser
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
