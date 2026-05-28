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

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// ---------------------------------------------------------------------------
// TODO: Replace the mock below with your real backend API call.
//
// The sendMessage function should:
//   1. POST { messages, sessionId } to your chat endpoint
//   2. Read the response as SSE (text/event-stream) or JSON
//   3. Stream tokens into the agent message via setMessages(...)
//   4. Emit phase/skill/file events via setActiveEvents(...)
//
// All state setters and the hook's return value stay the same — only swap
// the data source inside sendMessage.
//
// Example SSE event types the UI understands:
//   "delta"         — { text: string }              → appends to agent message
//   "phase"         — { phase, name, description }  → pipeline phase header
//   "skill_detect"  — { skills, reasoning, action } → skills detected
//   "file_fetch"    — { file, path, preview }        → file read activity
//   "done"          — {}                             → stream complete
//   "error"         — { error: string }              → error message
// ---------------------------------------------------------------------------

const MOCK_RESPONSE = `I can help you with that! This is a **sample response** from the Agent Console.

## Connecting Your Backend

To wire up a real AI backend:

1. Open \`src/hooks/use-chat-stream.ts\`
2. Replace the \`simulateMockStream\` call inside \`sendMessage\` with a real \`fetch\` to your API endpoint
3. Parse the SSE stream and call the provided state setters

The component will work identically once the data source is real. The sidebar's Skill Journeys, Knowledge Base, and Workspace panels are all wired to the same hook state.`;

async function simulateMockStream(
  content: string,
  agentMessageId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setActiveEvents: React.Dispatch<React.SetStateAction<ChatEvent[]>>,
  setCurrentPhase: React.Dispatch<React.SetStateAction<{ phase: number; name: string; description: string } | null>>,
  cancelledRef: React.MutableRefObject<boolean>
) {
  const phases = [
    { phase: 1, name: "Understanding", description: "Analyzing your request" },
    { phase: 2, name: "Processing", description: "Running agent pipeline" },
    { phase: 3, name: "Generating", description: "Composing response" },
  ];

  for (const p of phases) {
    if (cancelledRef.current) return;
    await new Promise(r => setTimeout(r, 280));
    setCurrentPhase(p);
    setActiveEvents(prev => [...prev, { type: "phase", data: p.name, timestamp: Date.now(), meta: p }]);
  }

  const response = content.toLowerCase().includes("survey")
    ? "I can help design a survey. Connect your backend to generate questions tailored to your engagement context and client industry."
    : content.toLowerCase().includes("benchmark")
    ? "Competitive benchmarking requires live data. Connect a search integration or your data backend to provide real-time competitor analysis."
    : content.toLowerCase().includes("policy") || content.toLowerCase().includes("analyz")
    ? "Policy analysis works best with your actual documents. Connect your document processing backend to analyze uploaded files."
    : MOCK_RESPONSE;

  for (let i = 0; i < response.length; i += 3) {
    if (cancelledRef.current) return;
    await new Promise(r => setTimeout(r, 18));
    const chunk = response.slice(i, i + 3);
    setMessages(prev => prev.map(msg =>
      msg.id === agentMessageId ? { ...msg, content: msg.content + chunk } : msg
    ));
  }
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeEvents, setActiveEvents] = useState<ChatEvent[]>([]);
  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<{ phase: number; name: string; description: string } | null>(null);
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [detectedClient, setDetectedClient] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const sessionIdRef = useRef<string>(generateSessionId());

  // Silence unused-variable warning on sessionIdRef — it's passed to real API calls
  void sessionIdRef;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const agentMessageId = Math.random().toString(36).substring(7);

    setMessages(prev => [
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
    cancelledRef.current = false;

    // ── Replace this block with your real API call ──────────────────────────
    // const response = await fetch("/api/your/chat/endpoint", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ message: content, sessionId: sessionIdRef.current }),
    // });
    // … read SSE stream and call setMessages / setActiveEvents / etc.
    // ───────────────────────────────────────────────────────────────────────
    await simulateMockStream(content, agentMessageId, setMessages, setActiveEvents, setCurrentPhase, cancelledRef);

    if (!cancelledRef.current) {
      setIsStreaming(false);
      setCurrentPhase(null);
    }
  }, []);

  const stopStream = useCallback(() => {
    cancelledRef.current = true;
    setIsStreaming(false);
  }, []);

  const resetChat = useCallback(() => {
    cancelledRef.current = true;
    setMessages([]);
    setIsStreaming(false);
    setActiveEvents([]);
    setActiveFiles([]);
    setCurrentPhase(null);
    setDetectedSkills([]);
    setDetectedClient(null);
    sessionIdRef.current = generateSessionId();
  }, []);

  return { messages, setMessages, isStreaming, activeEvents, activeFiles, currentPhase, detectedSkills, detectedClient, sendMessage, stopStream, resetChat };
}
