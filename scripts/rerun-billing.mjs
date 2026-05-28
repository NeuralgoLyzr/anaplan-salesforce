// Reset just the Billing stage (Gate 1 already approved) and re-drive to verify
// the jsonrepair fix gets us to Gate 2 with invoices/JEs parsed. Also restores
// the customer name. Run: node --env-file=.env.local scripts/rerun-billing.mjs [sid] [port]
import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const id = process.argv[2] || "59996f0c-794e-422b-93ad-c25867b365cd";
const port = process.argv[3] || "3002";

const client = new MongoClient(uri);
await client.connect();
const col = client.db(dbName).collection("sessions");
await col.updateOne({ session_id: id }, {
  $set: {
    company_name: "BPCE",
    status: "billing",
    errors: [],
    "gates.g2_per_bill": [],
    "agent_outputs.billing.status": "pending",
    "agent_outputs.billing.task_id": null,
    "agent_outputs.billing.attempts": 0,
    "agent_outputs.billing.error_code": null,
    "agent_outputs.billing.error_detail": null,
    "agent_outputs.billing.raw": null,
    "agent_outputs.billing.markdown": null,
    "agent_outputs.billing.json": null,
  },
});
await client.close();
console.log(`Reset billing for ${id} → billing. Driving…`);

const terminal = new Set(["gate2", "complete", "failed", "rejected"]);
let last = "", final = null;
for (let i = 0; i < 70; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(`http://localhost:${port}/api/companies/${id}/poll`, { method: "POST" });
  if (!res.ok) { console.log(`poll ${i} HTTP ${res.status}`); continue; }
  const { session } = await res.json();
  final = session;
  if (session.status !== last) { console.log(`[${i}] status=${session.status} billing=${session.agent_outputs.billing.status}`); last = session.status; }
  if (terminal.has(session.status)) break;
}

console.log(`\nFINAL status=${final.status}`);
for (const e of final.errors ?? []) console.log(`  error: ${e.code} (${e.agent}) — ${e.detail}`);
const bj = final.agent_outputs.billing.json;
if (bj) {
  const inv = bj.invoices ?? bj.bills ?? [];
  const jes = bj.journal_entries ?? [];
  console.log(`billing parsed ✓  invoices=${inv.length}  journal_entries=${jes.length}`);
  console.log("g2_per_bill:", JSON.stringify(final.gates.g2_per_bill));
}
