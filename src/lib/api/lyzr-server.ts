/**
 * SERVER-ONLY — import ONLY in route.ts files, never in client components.
 * The API key is read from environment variables and NEVER sent to the browser.
 * All Lyzr API calls are made server-side through Next.js API routes (proxy pattern).
 */

export function resolveApiKey(): string | null {
  return process.env.LYZR_API_KEY ?? null;
}

export const LYZR_API_BASE = (
  process.env.LYZR_BASE_URL ?? "https://agent-prod.studio.lyzr.ai"
).replace(/\/+$/, "");
