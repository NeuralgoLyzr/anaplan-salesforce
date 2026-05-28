import { llamaConfig } from "../config";

// LlamaCloud v2 Parse integration.
// Flow: upload file -> create parse job -> poll job status -> retrieve results.
// Mirrors the Lyzr task pattern (submit returns an id; poll a GET endpoint).

export type LlamaJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export class LlamaError extends Error {
  status?: number;
  raw?: unknown;
  constructor(message: string, status?: number, raw?: unknown) {
    super(message);
    this.name = "LlamaError";
    this.status = status;
    this.raw = raw;
  }
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${llamaConfig.apiKey()}` };
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

// ─── 1. Upload a file to obtain a file_id ────────────────────────
export async function uploadFile(buffer: ArrayBuffer, filename: string): Promise<string> {
  const projectQuery = llamaConfig.projectId() ? `?project_id=${encodeURIComponent(llamaConfig.projectId()!)}` : "";
  const form = new FormData();
  form.append("upload_file", new Blob([buffer], { type: "application/pdf" }), filename);

  const res = await fetch(`${llamaConfig.baseUrl}/api/v1/files${projectQuery}`, {
    method: "POST",
    headers: authHeaders(), // do NOT set Content-Type; fetch sets the multipart boundary
    body: form,
    cache: "no-store",
  });

  const raw = await safeJson(res);
  if (!res.ok) throw new LlamaError(`file upload failed (${res.status})`, res.status, raw);

  const r = asRecord(raw);
  const id = r && (r.id ?? r.file_id);
  if (typeof id !== "string" || !id) throw new LlamaError("file upload returned no id", res.status, raw);
  return id;
}

// ─── 2. Create a parse job ───────────────────────────────────────
export async function createParseJob(fileId: string): Promise<string> {
  const res = await fetch(`${llamaConfig.baseUrl}/api/v2/parse`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id: fileId,
      tier: llamaConfig.tier(),
      version: llamaConfig.version(),
    }),
    cache: "no-store",
  });

  const raw = await safeJson(res);
  if (!res.ok) throw new LlamaError(`create parse job failed (${res.status})`, res.status, raw);

  const r = asRecord(raw);
  const jobId = (asRecord(r?.job)?.id ?? r?.id ?? r?.job_id) as unknown;
  if (typeof jobId !== "string" || !jobId) throw new LlamaError("parse job returned no id", res.status, raw);
  return jobId;
}

// ─── 3. Poll job status (+ results once COMPLETED) ───────────────
export interface ParseJobResult {
  status: LlamaJobStatus;
  errorMessage: string | null;
  raw: unknown;
}

const DEFAULT_EXPAND = ["markdown", "text", "markdown_full", "text_full"];

export async function getParseJob(jobId: string, expand: string[] = DEFAULT_EXPAND): Promise<ParseJobResult> {
  const q = expand.length ? `?expand=${expand.join(",")}` : "";
  const res = await fetch(`${llamaConfig.baseUrl}/api/v2/parse/${encodeURIComponent(jobId)}${q}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });

  const raw = await safeJson(res);
  if (!res.ok) throw new LlamaError(`get parse job failed (${res.status})`, res.status, raw);

  const r = asRecord(raw);
  const job = asRecord(r?.job) ?? r;
  const status = String(job?.status ?? "RUNNING").toUpperCase() as LlamaJobStatus;
  const errorMessage = (job?.error_message as string | undefined) ?? null;

  return { status, errorMessage, raw };
}

// ─── Combine per-page results into one string with page markers ──
export function extractParseText(raw: unknown): string | null {
  const r = asRecord(raw);
  if (!r) return null;

  // Prefer per-page arrays (markdown is richer than plain text for tables).
  const pages = pageStrings(r.markdown) ?? pageStrings(r.text) ?? pagesFromObjects(r.pages);
  if (pages && pages.length) {
    const joined = pages
      .map((t, i) => `\n\n--- Page ${i + 1} ---\n\n${(t ?? "").trim()}`)
      .join("")
      .trim();
    if (joined.replace(/--- Page \d+ ---/g, "").trim().length > 0) return joined;
  }

  // Fall back to a concatenated full string (no page markers available).
  const full = r.markdown_full ?? r.text_full;
  if (typeof full === "string" && full.trim()) return full.trim();

  return null;
}

function pageStrings(val: unknown): string[] | null {
  if (!Array.isArray(val)) return null;
  return val.map((p) => {
    if (typeof p === "string") return p;
    const o = asRecord(p);
    if (o) return String(o.md ?? o.markdown ?? o.text ?? o.value ?? o.content ?? "");
    return "";
  });
}

function pagesFromObjects(val: unknown): string[] | null {
  if (!Array.isArray(val)) return null;
  return val.map((p) => {
    const o = asRecord(p);
    if (o) return String(o.md ?? o.markdown ?? o.text ?? o.value ?? o.content ?? "");
    return "";
  });
}
