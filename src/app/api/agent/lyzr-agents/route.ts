export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The four production pipeline agents, in pipeline order.
const AGENTS = [
  { key: "reader", step: "Read", envId: "LYZR_AGENT_READER_ID" },
  { key: "pricing", step: "Price & schedule", envId: "LYZR_AGENT_PRICING_ID" },
  { key: "anomaly", step: "Flag anomalies", envId: "LYZR_AGENT_ANOMALY_ID" },
  { key: "billing", step: "Bill & post JEs", envId: "LYZR_AGENT_BILLING_ID" },
];

interface LyzrAgentCard {
  key: string;
  step: string;
  id: string | null;
  name: string;
  description: string;
  model: string | null;
  provider: string | null;
  role: string;
  temperature: number | null;
  error?: string;
}

export async function GET() {
  const base = process.env.LYZR_BASE_URL || "https://agent-prod.studio.lyzr.ai";
  const key = process.env.LYZR_API_KEY;

  const results: LyzrAgentCard[] = await Promise.all(
    AGENTS.map(async (a): Promise<LyzrAgentCard> => {
      const id = process.env[a.envId] || null;
      const base0: LyzrAgentCard = {
        key: a.key,
        step: a.step,
        id,
        name: "",
        description: "",
        model: null,
        provider: null,
        role: "",
        temperature: null,
      };
      if (!id || !key) return { ...base0, name: a.key, error: "Not configured" };
      try {
        const res = await fetch(`${base}/v3/agents/${id}`, {
          headers: { "x-api-key": key, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return { ...base0, name: a.key, error: `Lyzr ${res.status}` };
        const d = await res.json();
        return {
          ...base0,
          name: d.name ?? a.key,
          description: d.description ?? "",
          model: d.model ?? null,
          provider: d.provider_id ?? null,
          role: d.agent_role ?? "",
          temperature: typeof d.temperature === "number" ? d.temperature : null,
        };
      } catch (e) {
        return { ...base0, name: a.key, error: (e as Error).message };
      }
    }),
  );

  return Response.json({ agents: results });
}
