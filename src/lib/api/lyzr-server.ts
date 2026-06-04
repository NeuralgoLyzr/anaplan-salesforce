/**
 * Server-only helper — import ONLY in route.ts files, never in client components.
 *
 * Reads LYZR_API_KEY from environment (single key; no multi-key support needed
 * for this project since all agents share the same key).
 */

export function resolveApiKey(): string | null {
  return process.env.LYZR_API_KEY ?? null;
}

export const LYZR_API_BASE =
  (process.env.LYZR_BASE_URL ?? "https://agent-prod.studio.lyzr.ai").replace(/\/+$/, "");
