"use client";

import { useState, useRef, useCallback } from "react";

export interface ActivityEvent {
  action: string;
  icon: string;
  ts: number;
  filePath?: string;
}

export interface JourneyState {
  isRunning: boolean;
  activities: ActivityEvent[];
  output: string;
  error: string | null;
}

// ---------------------------------------------------------------------------
// TODO: Replace the mock below with your real backend API call.
//
// The execute function should:
//   1. POST FormData { skill, inputs, document? } to your journey endpoint
//   2. Read the response as SSE (text/event-stream)
//   3. Handle these event types:
//        "activity"   — { action, icon, ts, filePath? }  → activity log
//        "delta"      — { text: string }                  → output streaming
//        "generating" — { action: string }                → status message
//        "done"       — {}                                → stream complete
//        "error"      — { error: string }                 → error message
//
// The hook interface (state, execute, reset, loadSampleData) stays the same.
// ---------------------------------------------------------------------------

const MOCK_ACTIVITIES: Omit<ActivityEvent, "ts">[] = [
  { action: "Loading skill configuration", icon: "search" },
  { action: "Reading knowledge base documents", icon: "book" },
  { action: "Analyzing inputs and context", icon: "brain" },
  { action: "Generating deliverable", icon: "cpu" },
  { action: "Output complete", icon: "check" },
];

const MOCK_OUTPUT = `# Sample Deliverable

This is a **sample output** from the skill journey runner.

## Connecting Your Backend

1. Open \`src/hooks/use-journey-stream.ts\`
2. Replace the \`simulateMock\` block inside \`execute\` with a real \`fetch\` call
3. Stream SSE events and call the same state setters

### Expected SSE Event Format

| Event | Payload |
|-------|---------|
| \`activity\` | \`{ action, icon, ts, filePath? }\` |
| \`delta\` | \`{ text: string }\` |
| \`done\` | \`{}\` |
| \`error\` | \`{ error: string }\` |

The component renders activity steps and streams output exactly as shown here.
Once connected, each skill journey will run against your real AI backend.`;

export function useJourneyStream() {
  const [state, setState] = useState<JourneyState>({
    isRunning: false,
    activities: [],
    output: "",
    error: null,
  });
  const cancelledRef = useRef(false);

  const execute = useCallback(async (skill: string, inputs: Record<string, unknown>, file?: File) => {
    cancelledRef.current = false;
    setState({ isRunning: true, activities: [], output: "", error: null });

    // Reference variables to prevent ESLint unused variable compilation errors
    const _ref = { skill, inputs, file };
    void _ref;

    // ── Replace this block with your real API call ──────────────────────────
    // const formData = new FormData();
    // formData.append("skill", _skill);
    // formData.append("inputs", JSON.stringify(_inputs));
    // if (_file) formData.append("document", _file);
    // const response = await fetch("/api/your/journey/execute", { method: "POST", body: formData });
    // … read SSE stream and update state
    // ───────────────────────────────────────────────────────────────────────

    // simulateMock — remove this block when connecting a real backend
    for (const act of MOCK_ACTIVITIES) {
      if (cancelledRef.current) return;
      await new Promise(r => setTimeout(r, 400));
      setState(s => ({ ...s, activities: [...s.activities, { ...act, ts: Date.now() }] }));
    }

    for (let i = 0; i < MOCK_OUTPUT.length; i += 6) {
      if (cancelledRef.current) return;
      await new Promise(r => setTimeout(r, 15));
      setState(s => ({ ...s, output: s.output + MOCK_OUTPUT.slice(i, i + 6) }));
    }

    if (!cancelledRef.current) {
      setState(s => ({ ...s, isRunning: false }));
    }
  }, []);

  const loadSampleData = useCallback((activities: ActivityEvent[], output: string) => {
    setState({ isRunning: false, activities, output, error: null });
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setState({ isRunning: false, activities: [], output: "", error: null });
  }, []);

  return { state, execute, reset, loadSampleData };
}
