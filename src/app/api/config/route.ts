import { NextResponse } from "next/server";

/**
 * GET /api/config
 * Returns agent profiles defined in .env.local for the trace analytics
 * filter dropdown.  No secret values are exposed — only names and IDs.
 */
export async function GET() {
  function optional(name: string): string {
    return process.env[name] ?? "";
  }

  // Env vars: LYZR_AGENT_READER_ID, LYZR_AGENT_PRICING_ID,
  //           LYZR_AGENT_ANOMALY_ID, LYZR_AGENT_BILLING_ID
  const agentProfiles = [
    { name: "Reader Agent",  agentId: optional("LYZR_AGENT_READER_ID")  },
    { name: "Pricing Agent", agentId: optional("LYZR_AGENT_PRICING_ID") },
    { name: "Anomaly Agent", agentId: optional("LYZR_AGENT_ANOMALY_ID") },
    { name: "Billing Agent", agentId: optional("LYZR_AGENT_BILLING_ID") },
  ].filter(p => p.agentId);

  return NextResponse.json({
    agentProfiles,
    agents: [{ name: "Default", agentId: "", index: 0 }],
    defaultAgentId: "",
  });
}
