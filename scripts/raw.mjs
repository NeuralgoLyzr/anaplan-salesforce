// Print the full raw response of one agent for a session.
// Run: node --env-file=.env.local scripts/raw.mjs <session_id|company> <agent>
import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const who = process.argv[2] || "BPCE";
const agent = process.argv[3] || "billing";
const client = new MongoClient(uri);
await client.connect();
const s = await client.db(dbName).collection("sessions").findOne({ $or: [{ company_name: who }, { session_id: who }] });
await client.close();
if (!s) { console.log("no session"); process.exit(0); }
const out = s.agent_outputs[agent];
console.log(`agent=${agent} status=${out.status} error=${out.error_code} len=${out.raw?.length ?? 0}`);
console.log("=== RAW START ===");
console.log(out.raw ?? "(null)");
console.log("=== RAW END ===");
