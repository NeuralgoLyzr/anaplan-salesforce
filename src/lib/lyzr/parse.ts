import { jsonrepair } from "jsonrepair";

// Each agent returns a markdown brief followed by a single fenced JSON block.
// This splits the two, parses the JSON, and surfaces agent-level
// { "error": true, ... } payloads.
//
// Note: the Billing agent embeds full multi-line invoice markdown inside JSON
// string values, which often arrives with unescaped control characters (raw
// newlines/tabs). Strict JSON.parse rejects that, so we fall back to jsonrepair.

export interface ParsedAgentResponse {
  markdown: string;
  json: Record<string, unknown> | null;
  // Set when the agent itself reported a structured error in its JSON tail.
  agentError: { error_code: string; error_detail: string } | null;
  // Set when we could not extract/parse a JSON block at all.
  parseError: string | null;
}

const FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/gi;

export function parseAgentResponse(text: string): ParsedAgentResponse {
  if (!text || !text.trim()) {
    return { markdown: "", json: null, agentError: null, parseError: "Empty response" };
  }

  const fences: { body: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((m = FENCE_RE.exec(text)) !== null) {
    fences.push({ body: m[1].trim(), start: m.index, end: m.index + m[0].length });
  }

  // Prefer the last fence that parses as a JSON object.
  let json: Record<string, unknown> | null = null;
  let jsonStart = -1;
  for (let i = fences.length - 1; i >= 0; i--) {
    const parsed = tryParseObject(fences[i].body);
    if (parsed) {
      json = parsed;
      jsonStart = fences[i].start;
      break;
    }
  }

  // Fallback: a trailing bare JSON object with no code fence.
  if (!json) {
    const bare = extractTrailingObject(text);
    if (bare) {
      json = bare.obj;
      jsonStart = bare.start;
    }
  }

  const markdown = (jsonStart >= 0 ? text.slice(0, jsonStart) : text).trim();

  if (!json) {
    return { markdown, json: null, agentError: null, parseError: "No JSON block found" };
  }

  let agentError: ParsedAgentResponse["agentError"] = null;
  if (json.error === true) {
    agentError = {
      error_code: String(json.error_code ?? "UNKNOWN"),
      error_detail: String(json.error_detail ?? json.message ?? "Agent reported an error"),
    };
  }

  return { markdown, json, agentError, parseError: null };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function tryParseObject(s: string): Record<string, unknown> | null {
  if (!s) return null;
  // Strict parse first (clean output stays untouched).
  try {
    return asObject(JSON.parse(s));
  } catch {
    /* fall through to repair */
  }
  // Repair common LLM-JSON issues (unescaped newlines in strings, trailing
  // commas, etc.) — essential for the Billing agent's embedded markdown.
  try {
    return asObject(JSON.parse(jsonrepair(s)));
  } catch {
    return null;
  }
}

// Find the last top-level { ... } in the text and try to parse it.
function extractTrailingObject(text: string): { obj: Record<string, unknown>; start: number } | null {
  const lastClose = text.lastIndexOf("}");
  if (lastClose === -1) return null;

  let depth = 0;
  for (let i = lastClose; i >= 0; i--) {
    const ch = text[i];
    if (ch === "}") depth++;
    else if (ch === "{") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(i, lastClose + 1);
        const obj = tryParseObject(candidate);
        if (obj) return { obj, start: i };
        return null;
      }
    }
  }
  return null;
}
