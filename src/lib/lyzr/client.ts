import { randomUUID } from "crypto";
import { lyzrConfig } from "../config";

// ─── Submit ──────────────────────────────────────────────────────
// POST /v3/inference/chat/task
// Each call uses a fresh random session_id (never reused). The agent
// payload is delivered as a stringified JSON in the `message` field.

export interface SubmitResult {
  taskId: string | null;
  sessionId: string;
  // If the deployment answered synchronously instead of returning a task id,
  // the text response is surfaced here so the caller can short-circuit polling.
  immediateText: string | null;
  raw: unknown;
}

export async function submitTask(agentId: string, payload: unknown): Promise<SubmitResult> {
  const sessionId = randomUUID();
  const body = {
    user_id: lyzrConfig.userId(),
    agent_id: agentId,
    session_id: sessionId,
    message: JSON.stringify(payload),
  };

  const res = await fetch(`${lyzrConfig.baseUrl}/v3/inference/chat/task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "x-api-key": lyzrConfig.apiKey(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await safeJson(res);
  if (!res.ok) {
    throw new LyzrError(`submitTask failed (${res.status})`, res.status, raw);
  }

  return {
    taskId: extractTaskId(raw),
    sessionId,
    immediateText: extractResponseText(raw),
    raw,
  };
}

// ─── Poll ────────────────────────────────────────────────────────
// GET /v3/inference/chat/task/{task_id}

export type TaskState = "running" | "done" | "failed";

export interface TaskStatusResult {
  state: TaskState;
  text: string | null; // agent response text once done
  raw: unknown;
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResult> {
  const res = await fetch(
    `${lyzrConfig.baseUrl}/v3/inference/chat/task/${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": lyzrConfig.apiKey(),
      },
      cache: "no-store",
    }
  );

  const raw = await safeJson(res);
  if (!res.ok) {
    throw new LyzrError(`getTaskStatus failed (${res.status})`, res.status, raw);
  }

  return {
    state: normalizeState(raw),
    text: extractResponseText(raw),
    raw,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

export class LyzrError extends Error {
  status?: number;
  raw?: unknown;
  constructor(message: string, status?: number, raw?: unknown) {
    super(message);
    this.name = "LyzrError";
    this.status = status;
    this.raw = raw;
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _text: text };
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function extractTaskId(raw: unknown): string | null {
  const r = asRecord(raw);
  if (!r) return null;
  for (const key of ["task_id", "taskId", "id", "_id"]) {
    const v = r[key];
    if (typeof v === "string" && v) return v;
  }
  const nested = asRecord(r.data) ?? asRecord(r.result);
  if (nested) {
    for (const key of ["task_id", "taskId", "id"]) {
      const v = nested[key];
      if (typeof v === "string" && v) return v;
    }
  }
  return null;
}

// Lyzr task statuses vary by deployment; normalize tolerantly.
function normalizeState(raw: unknown): TaskState {
  const r = asRecord(raw);
  if (!r) return "running";
  const status = String(
    r.status ?? r.state ?? (asRecord(r.data)?.status ?? "") ?? ""
  ).toLowerCase();

  if (["completed", "complete", "success", "succeeded", "done", "finished"].includes(status)) {
    return "done";
  }
  if (["failed", "error", "errored", "cancelled", "canceled"].includes(status)) {
    return "failed";
  }
  // If no recognizable status field but a response payload is present, treat as done.
  if (!status && extractResponseText(raw)) return "done";
  return "running";
}

// Pull the agent's text response from a variety of possible shapes.
export function extractResponseText(raw: unknown): string | null {
  const r = asRecord(raw);
  if (!r) return typeof raw === "string" ? raw : null;

  const candidates: unknown[] = [
    // Lyzr task shape: { status, response: { response: "<text>", module_outputs } }
    asRecord(r.response)?.response,
    asRecord(r.response)?.output,
    asRecord(r.response)?.text,
    asRecord(r.response)?.message,
    asRecord(r.response)?.content,
    r.response,
    r.result,
    r.output,
    r.answer,
    r.message,
    r.text,
    asRecord(r.result)?.response,
    asRecord(r.result)?.output,
    asRecord(r.data)?.response,
    asRecord(r.data)?.result,
    asRecord(r.data)?.output,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}
