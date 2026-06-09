import { NextRequest } from "next/server";
import { query, tool } from "@open-gitagent/gitagent";
import { listSessions, getSession } from "@/lib/rev-rec/repo";
import { getAgentDir } from "@/lib/agent-dir";

// gitagent is Node-native (git/fs/child_process) — must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = process.env.GITAGENT_MODEL || "anthropic:claude-sonnet-4-5-20250929";

// ── Custom tools the copilot can call ────────────────────────────────────────

// Live workspace data — lets the agent answer "what's awaiting approval", etc.
const listContracts = tool(
  "list_contracts",
  "List the live revenue-recognition contracts in this workspace with their status, file count, total revenue, projection months, anomaly count, invoice count and source. Use for any question about the actual contracts in the app.",
  { properties: {}, required: [] },
  async () => {
    try {
      const sessions = await listSessions();
      const slim = sessions.map((s) => ({
        id: s.session_id,
        company: s.company_name,
        status: s.status,
        files: s.file_count,
        total_revenue: s.total_revenue,
        projection_months: s.projection_months,
        anomalies: s.anomaly_count,
        invoices: s.invoice_count,
        source: s.source ?? "manual",
      }));
      return { text: JSON.stringify(slim), details: { count: slim.length } };
    } catch (e) {
      return `Could not load contracts: ${(e as Error).message}`;
    }
  },
);

// Contract detail — lets the agent answer revenue breakdown questions per contract.
// Priority 5 fix: without this, the copilot had no way to fetch monthly projections
// and would redirect the user instead of answering.
const getContractDetail = tool(
  "get_contract_detail",
  "Get the full revenue schedule for a specific contract — monthly projections, per-line allocations, and totals. Use this to answer questions like 'show me Ontario April 2026 revenue', 'what is the breakdown for contract X', or 'total revenue recognised for Y'. Call list_contracts first to find the session_id, then call this.",
  {
    properties: {
      session_id: { type: "string", description: "The session ID of the contract (returned by list_contracts)" },
    },
    required: ["session_id"],
  },
  async (args: { session_id: string }) => {
    try {
      const session = await getSession(String(args.session_id));
      if (!session) return `No contract found with session ID: ${args.session_id}`;
      const pricing = session.agent_outputs?.pricing;
      if (!pricing?.json) {
        return `Pricing data not yet available for session ${args.session_id} (pipeline status: ${session.status}).`;
      }
      const readerJson = session.agent_outputs?.reader?.json ?? {};
      const contractTotal =
        readerJson.contract_total_value ??
        readerJson.total_contract_value ??
        pricing.json.contract_total_value ??
        null;
      return JSON.stringify({
        contract_id: session.session_id,
        company: session.company_name,
        status: session.status,
        contract_total_value: contractTotal,
        allocation: pricing.json.allocation ?? null,
        monthly_projection: pricing.json.monthly_projection ?? null,
      });
    } catch (e) {
      return `Could not load contract detail: ${(e as Error).message}`;
    }
  },
);

// Artifact — the agent emits a deliverable that the UI renders in the side panel.
// The handler just acknowledges; the content reaches the client by intercepting
// the tool_use event in the stream below.
const createArtifact = tool(
  "create_artifact",
  "Create an artifact shown in the side panel — for deliverables the user will keep (a revenue schedule, a journal-entry table, a memo, a checklist). Provide a title, a kind, and the full content as markdown.",
  {
    properties: {
      title: { type: "string", description: "Short artifact title" },
      kind: { type: "string", enum: ["markdown", "table", "code", "memo"], description: "Artifact kind" },
      content: { type: "string", description: "Full artifact content as markdown" },
    },
    required: ["title", "content"],
  },
  async (args) => `Artifact "${args.title}" created and shown in the side panel.`,
);

// ── SSE helpers ──────────────────────────────────────────────────────────────

function sse(controller: ReadableStreamDefaultController, obj: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
}

function basename(p: string): string {
  return (p || "").split("/").filter(Boolean).pop() ?? p;
}

// Map a built-in `read` tool call onto the UI's skill/file activity events.
function readActivity(args: Record<string, unknown>) {
  const p = String(args.path ?? args.file ?? "");
  const norm = p.replace(/\\/g, "/");
  const skillMatch = norm.match(/skills\/([^/]+)\//);
  if (skillMatch) {
    return { type: "skill_read", skill: skillMatch[1], path: norm };
  }
  if (norm.includes("knowledge/")) {
    return { type: "file_read", file: basename(norm), path: norm };
  }
  return { type: "file_read", file: basename(norm), path: norm };
}

export async function POST(req: NextRequest) {
  let message = "";
  let sessionId: string | undefined;
  try {
    const body = await req.json();
    message = String(body.message ?? "").trim();
    sessionId = body.sessionId ? String(body.sessionId) : undefined;
  } catch {
    /* ignore */
  }

  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  const agentDir = await getAgentDir();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const q = query({
          prompt: message,
          dir: agentDir,
          model: MODEL,
          // Priority 5 — added getContractDetail so the copilot can answer
          // per-contract revenue breakdown questions instead of redirecting.
          tools: [listContracts, getContractDetail, createArtifact],
          allowedTools: ["read", "list_contracts", "get_contract_detail", "create_artifact"],
          maxTurns: 24,
          abortController,
          ...(sessionId ? { sessionId } : {}),
        });

        sse(controller, { type: "session", sessionId: q.sessionId() });

        for await (const msg of q) {
          switch (msg.type) {
            case "delta":
              if (msg.deltaType === "text") sse(controller, { type: "delta", text: msg.content });
              else sse(controller, { type: "thinking", text: msg.content });
              break;

            case "tool_use": {
              if (msg.toolName === "read") {
                sse(controller, { tool: "read", ...readActivity(msg.args) });
              } else if (msg.toolName === "create_artifact") {
                sse(controller, {
                  type: "artifact",
                  id: msg.toolCallId,
                  title: msg.args.title,
                  kind: msg.args.kind ?? "markdown",
                  content: msg.args.content ?? "",
                });
              } else {
                sse(controller, { type: "action", tool: msg.toolName, args: msg.args });
              }
              break;
            }

            case "tool_result":
              sse(controller, {
                type: "action_done",
                tool: msg.toolName,
                isError: msg.isError,
              });
              break;

            case "assistant":
              if (msg.errorMessage) {
                sse(controller, { type: "error", error: msg.errorMessage });
              }
              if (msg.usage) {
                sse(controller, { type: "usage", usage: msg.usage });
              }
              break;

            case "system":
              if (msg.subtype === "error") {
                sse(controller, { type: "error", error: msg.content });
              }
              break;
          }
        }

        sse(controller, { type: "done" });
      } catch (e) {
        sse(controller, { type: "error", error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
