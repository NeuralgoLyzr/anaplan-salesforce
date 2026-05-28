// Reset a failed session and drive it through the live pipeline via the local
// poll endpoint, printing progress and final agent JSON shapes.
// Run (dev server must be up on PORT): node --env-file=.env.local scripts/rerun.mjs [company] [port]
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const company = process.argv[2] || "BPCE";
const port = process.argv[3] || "3002";

const client = new MongoClient(uri);
await client.connect();
const col = client.db(dbName).collection("sessions");
const s = await col.findOne({ company_name: company });
if (!s) { console.log(`No session for ${company}`); process.exit(0); }
const id = s.session_id;

// Reset to the start of the pipeline.
await col.updateOne({ session_id: id }, {
  $set: {
    status: "reading",
    errors: [],
    "agent_outputs.reader.status": "pending",
    "agent_outputs.reader.task_id": null,
    "agent_outputs.reader.attempts": 0,
    "agent_outputs.reader.error_code": null,
    "agent_outputs.reader.error_detail": null,
    "agent_outputs.reader.raw": null,
    "agent_outputs.reader.markdown": null,
    "agent_outputs.reader.json": null,
  },
});
console.log(`Reset ${company} (${id}) → reading. Driving via http://localhost:${port}/api/companies/${id}/poll`);

const terminal = new Set(["gate1", "gate2", "complete", "failed", "rejected"]);
let last = "";
let final = null;
for (let i = 0; i < 130; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(`http://localhost:${port}/api/companies/${id}/poll`, { method: "POST" });
  if (!res.ok) { console.log(`poll ${i} HTTP ${res.status}`); continue; }
  const { session } = await res.json();
  final = session;
  if (session.status !== last) {
    console.log(`[${i}] status=${session.status}  reader=${session.agent_outputs.reader.status} pricing=${session.agent_outputs.pricing.status} anomaly=${session.agent_outputs.anomaly.status} billing=${session.agent_outputs.billing.status}`);
    last = session.status;
  }
  if (terminal.has(session.status)) break;
}

if (final) {
  console.log(`\nFINAL status=${final.status}`);
  for (const e of final.errors ?? []) console.log(`  error: ${e.code} (${e.agent}) — ${e.detail}`);
  const keys = (o) => (o && typeof o === "object" ? Object.keys(o) : null);
  console.log("\nreader.json keys:", keys(final.agent_outputs.reader.json));
  console.log("pricing.json keys:", keys(final.agent_outputs.pricing.json));
  if (final.agent_outputs.pricing.json) {
    const pj = final.agent_outputs.pricing.json;
    console.log("  pricing.allocation type:", Array.isArray(pj.allocation) ? `array[${pj.allocation.length}]` : typeof pj.allocation, "sample keys:", keys(Array.isArray(pj.allocation) ? pj.allocation[0] : pj.allocation));
    console.log("  pricing.monthly_projection type:", Array.isArray(pj.monthly_projection) ? `array[${pj.monthly_projection.length}]` : typeof pj.monthly_projection, "sample keys:", keys(Array.isArray(pj.monthly_projection) ? pj.monthly_projection[0] : pj.monthly_projection));
    console.log("  pricing.reconciliation:", JSON.stringify(pj.reconciliation));
  }
  console.log("anomaly.json keys:", keys(final.agent_outputs.anomaly.json));
  if (final.agent_outputs.anomaly.json) {
    const aj = final.agent_outputs.anomaly.json;
    console.log("  anomaly.anomalies:", Array.isArray(aj.anomalies) ? `array[${aj.anomalies.length}]` : typeof aj.anomalies, "sample keys:", keys(Array.isArray(aj.anomalies) ? aj.anomalies[0] : null));
    console.log("  anomaly.summary:", JSON.stringify(aj.summary));
  }
}
await client.close();
