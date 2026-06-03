"use client";

import { useState, useRef, useCallback } from "react";

export type MessageRole = "user" | "agent";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export interface ChatEvent {
  type: string;
  data: string | Record<string, unknown>;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
}

export interface Artifact {
  id: string;
  title: string;
  kind: string;
  content: string;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// Maps the gitagent-backed SSE events from /api/agent/chat onto the UI's
// existing event primitives. The agent's built-in `read` tool reading a
// SKILL.md or knowledge file is what produces the "reading skill / file"
// activity — it's real, not simulated.
export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeEvents, setActiveEvents] = useState<ChatEvent[]>([]);
  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<{ phase: number; name: string; description: string } | null>(null);
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [detectedClient, setDetectedClient] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const agentMessageId = Math.random().toString(36).substring(7);
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(7), role: "user", content },
      { id: agentMessageId, role: "agent", content: "" },
    ]);
    setIsStreaming(true);
    setActiveEvents([]);
    setActiveFiles([]);
    setCurrentPhase(null);
    setDetectedSkills([]);
    setDetectedClient(null);

    const pushEvent = (type: string, data: ChatEvent["data"], meta?: Record<string, unknown>) =>
      setActiveEvents((prev) => [...prev, { type, data, timestamp: Date.now(), meta }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId: sessionIdRef.current }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const appendText = (text: string) =>
        setMessages((prev) => prev.map((m) => (m.id === agentMessageId ? { ...m, content: m.content + text } : m)));

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          switch (evt.type) {
            case "delta":
              appendText(String(evt.text ?? ""));
              break;

            case "skill_read": {
              const skill = String(evt.skill ?? "");
              setDetectedSkills((prev) => (prev.includes(skill) ? prev : [...prev, skill]));
              pushEvent("skill_loading", skill, { action: `Reading skill · ${skill}`, path: evt.path });
              break;
            }

            case "file_read": {
              const file = String(evt.file ?? "");
              setActiveFiles((prev) => (prev.includes(file) ? prev : [...prev, file]));
              pushEvent("file_fetch", file, { action: `Reading file · ${file}`, path: evt.path, category: "knowledge" });
              break;
            }

            case "action": {
              const tool = String(evt.tool ?? "tool");
              const label = tool === "list_contracts" ? "Queried live pipeline data · list_contracts" : `Called tool · ${tool}`;
              pushEvent("tool_call", tool, { action: label, category: "integration" });
              break;
            }

            case "artifact":
              setArtifacts((prev) => [
                ...prev,
                {
                  id: String(evt.id ?? Math.random().toString(36).slice(2)),
                  title: String(evt.title ?? "Artifact"),
                  kind: String(evt.kind ?? "markdown"),
                  content: String(evt.content ?? ""),
                },
              ]);
              pushEvent("skill_execute", String(evt.title ?? "Artifact"), { action: `Created artifact · ${evt.title}` });
              break;

            case "error":
              appendText(`\n\n> ⚠️ ${String(evt.error ?? "Something went wrong.")}`);
              break;

            case "done":
              break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMessageId ? { ...m, content: m.content || `⚠️ ${(e as Error).message}` } : m,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      setCurrentPhase(null);
      abortRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    setActiveEvents([]);
    setActiveFiles([]);
    setCurrentPhase(null);
    setDetectedSkills([]);
    setDetectedClient(null);
    setArtifacts([]);
    sessionIdRef.current = generateSessionId();
  }, []);

  return { messages, setMessages, isStreaming, activeEvents, activeFiles, currentPhase, detectedSkills, detectedClient, artifacts, sendMessage, stopStream, resetChat };
}
