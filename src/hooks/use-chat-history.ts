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

const STORAGE_KEY = "agent-console-chat-history";

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";
  const text = firstUser.content.trim();
  return text.length > 60 ? text.slice(0, 57) + "…" : text;
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const saveSession = useCallback(
    (messages: ChatMessage[], existingId?: string) => {
      if (messages.length === 0) return null;

      const now = Date.now();
      const id = existingId || `chat-${now}-${Math.random().toString(36).substring(2, 8)}`;
      const title = deriveTitle(messages);

      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        let updated: ChatSession[];

        if (idx >= 0) {
          // Update existing
          updated = prev.map((s) =>
            s.id === id ? { ...s, title, messages, updatedAt: now } : s
          );
        } else {
          // Add new at the top
          updated = [
            { id, title, messages, createdAt: now, updatedAt: now },
            ...prev,
          ];
        }

        persistSessions(updated);
        return updated;
      });

      return id;
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      persistSessions(updated);
      return updated;
    });
  }, []);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    persistSessions([]);
  }, []);

  const getSession = useCallback(
    (id: string): ChatSession | undefined => {
      return sessions.find((s) => s.id === id);
    },
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
