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
        "group relative rounded-[4px] border transition-all duration-200 cursor-pointer",
        isActive
          ? "border-[#e6ebf8] bg-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] shadow-primary/10"
          : "border-[#e6ebf8] dark:border-[#e6ebf8] bg-white dark:bg-[#f0f1f7] hover:border-[#e6ebf8] hover:bg-[#f0f1f7] hover:shadow-[0_2px_4px_rgba(36,45,72,0.15)]"
      )}
      onClick={onSelect}
    >
      <div className="px-3.5 py-3 flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 mt-0.5 p-1.5 rounded-[4px] transition-colors",
            isActive ? "bg-[#e6ebf8]" : "bg-[#f0f1f7] group-hover:bg-[#e6ebf8]"
          )}
        >
          <MessageSquare
            className={cn(
              "w-3.5 h-3.5",
              isActive ? "text-[#3c67ea]" : "text-[#485478] group-hover:text-[#485478]"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                "text-[0.75rem] leading-[1.2] font-semibold truncate block flex-1",
                isActive ? "text-[#3c67ea]" : "text-[#242d48]"
              )}
            >
              {session.title}
            </span>
            {isActive && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#3c67ea] flex-shrink-0" />
            )}
          </div>

          <p className="text-[0.75rem] text-[#485478] line-clamp-2 leading-[1.2] mb-1.5">
            {chatPreview(session)}
          </p>

          <div className="flex items-center gap-3 text-[0.75rem] text-[#485478]">
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
            "flex-shrink-0 p-1.5 rounded-[4px] transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
            "text-[#485478] hover:text-[#db3743] hover:bg-white"
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
          className="absolute inset-0 z-20 flex items-center justify-center bg-[#f0f1f7]  rounded-[4px]"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-5 mx-4 max-w-[260px] text-center shadow-[0_4px_8px_rgba(36,45,72,0.20)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-[4px] bg-white flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5 text-[#db3743]" />
            </div>
            <h4 className="text-[0.875rem] font-semibold text-[#242d48] mb-1">
              Clear All History?
            </h4>
            <p className="text-[0.75rem] text-[#485478] mb-4 leading-[1.2]">
              This will permanently delete all saved chat sessions. This action
              cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-[0.875rem] font-semibold rounded-[2px] shadow-[inset_0_0_0_1px_#3c67ea] text-[#3c67ea] hover:bg-[#f0f1f7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-3 py-2 text-[0.75rem] leading-[1.2] font-medium rounded-[4px] bg-[#db3743] text-[#db3743]-foreground hover:bg-white transition-colors"
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
      <div className="w-14 h-14 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center mb-4">
        <MessagesSquare className="w-6 h-6 text-[#485478]" />
      </div>
      <h4 className="text-[0.875rem] font-semibold text-[#242d48] mb-1.5">
        No Chat History
      </h4>
      <p className="text-[0.75rem] leading-[1.2] text-[#485478] max-w-[200px] leading-[1.2]">
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
            className="fixed inset-0 z-40 bg-[#f0f1f7] "
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
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#e6ebf8]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-[4px] bg-[#e6ebf8]">
                  <MessagesSquare className="w-4 h-4 text-[#3c67ea]" />
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-[#242d48]">
                    Chat History
                  </h3>
                  <span className="text-[0.75rem] text-[#485478]">
                    {sessions.length}{" "}
                    {sessions.length === 1 ? "conversation" : "conversations"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {sessions.length > 0 && (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="px-2.5 py-1.5 text-[0.75rem] font-medium text-[#db3743] hover:text-[#db3743] hover:bg-white rounded-[4px] transition-all"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-[#f0f1f7] rounded-[4px] text-[#485478] transition-colors"
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
            <div className="px-5 py-3 border-t border-[#e6ebf8]">
              <p className="text-[0.75rem] text-[#485478] text-center">
                History is stored locally in your browser
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
