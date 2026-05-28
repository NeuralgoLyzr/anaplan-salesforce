// Debug: inspect the raw Lyzr task-status response shape for a stored session.
// Run: node --env-file=.env.local scripts/inspect-task.mjs [companyName]
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const base = (process.env.LYZR_BASE_URL || "https://agent-prod.studio.lyzr.ai").replace(/\/+$/, "");
const key = process.env.LYZR_API_KEY;
const company = process.argv[2] || "BPCE";

const client = new MongoClient(uri);
await client.connect();
const s = await client.db(dbName).collection("sessions").findOne({ company_name: company });
if (!s) {
  console.log(`No session for company "${company}"`);
  process.exit(0);
}

for (const agent of ["reader", "pricing", "anomaly", "billing"]) {
  const a = s.agent_outputs[agent];
  if (!a.task_id && a.status === "pending") continue;
  console.log(`\n=== ${agent} === status=${a.status} task_id=${a.task_id} attempts=${a.attempts}`);
  if (a.error_code) console.log(`  error: ${a.error_code} — ${a.error_detail}`);
  console.log(`  stored raw (first 300): ${JSON.stringify(a.raw)?.slice(0, 300)}`);

  if (a.task_id) {
    try {
      const res = await fetch(`${base}/v3/inference/chat/task/${a.task_id}`, {
        headers: { accept: "application/json", "x-api-key": key },
      });
      const txt = await res.text();
      console.log(`  GET task → HTTP ${res.status}`);
      console.log(`  RAW RESPONSE:\n${txt.slice(0, 4000)}`);
    } catch (e) {
      console.log(`  fetch error: ${e.message}`);
    }
  }
}

await client.close();
