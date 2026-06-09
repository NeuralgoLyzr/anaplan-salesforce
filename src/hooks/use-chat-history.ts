"use client";

import { useState, useCallback, useEffect } from "react";
import type { ChatMessage } from "./use-chat-stream";

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";
  const text = firstUser.content.trim();
  return text.length > 60 ? text.slice(0, 57) + "…" : text;
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Load from MongoDB on mount
  useEffect(() => {
    fetch("/api/chat-sessions")
      .then((r) => r.json())
      .then((data: ChatSession[]) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const saveSession = useCallback(
    (messages: ChatMessage[], existingId?: string) => {
      if (messages.length === 0) return null;

      const now = Date.now();
      const id = existingId || `chat-${now}-${Math.random().toString(36).substring(2, 8)}`;
      const title = deriveTitle(messages);
      const session: ChatSession = {
        id,
        title,
        messages,
        createdAt: existingId ? (sessions.find((s) => s.id === existingId)?.createdAt ?? now) : now,
        updatedAt: now,
      };

      // Optimistic update
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = session;
          return updated;
        }
        return [session, ...prev];
      });

      // Persist to MongoDB. keepalive: true keeps the request alive even if
      // the user closes the tab or navigates away (browser unload).
      fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
        keepalive: true,
      }).catch(() => {});

      return id;
    },
    [sessions]
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    fetch(`/api/chat-sessions/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    fetch("/api/chat-sessions", { method: "DELETE" }).catch(() => {});
  }, []);

  const getSession = useCallback(
    (id: string): ChatSession | undefined => sessions.find((s) => s.id === id),
    [sessions]
  );

  return {
    sessions,
    saveSession,
    deleteSession,
    clearAllSessions,
    getSession,
  };
}
