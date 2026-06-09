import { NextResponse } from "next/server";

/**
 * GET /api/config
 * Returns agent names + IDs for the trace filter dropdown.
 * SECURITY: Only non-secret values are returned. API keys are NEVER exposed.
 */
export async function GET() {
  const optional = (name: string) => process.env[name] ?? "";

  const agentProfiles = [
    { name: "Reader Agent",  agentId: optional("LYZR_AGENT_READER_ID")  },
    { name: "Pricing Agent", agentId: optional("LYZR_AGENT_PRICING_ID") },
    { name: "Anomaly Agent", agentId: optional("LYZR_AGENT_ANOMALY_ID") },
    { name: "Billing Agent", agentId: optional("LYZR_AGENT_BILLING_ID") },
    { name: "Copilot",       agentId: "copilot" },
  ].filter((p) => p.agentId);

  return NextResponse.json({
    agentProfiles,
    agents: [{ name: "Default", agentId: "", index: 0 }],
    defaultAgentId: "",
  });
}
