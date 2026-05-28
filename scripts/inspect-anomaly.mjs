import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const client = new MongoClient(uri);
await client.connect();
const s = await client.db(dbName).collection("sessions").findOne({ session_id: "59996f0c-794e-422b-93ad-c25867b365cd" });
await client.close();
const an = s.agent_outputs.anomaly.json;
console.log("anomaly[0] full keys:", Object.keys(an.anomalies[0]));
for (let i = 0; i < Math.min(3, an.anomalies.length); i++) {
  const a = an.anomalies[i];
  console.log(`\n--- anomaly[${i}] "${a.title}" ---`);
  console.log("evidence type:", Array.isArray(a.evidence) ? `array[${a.evidence.length}]` : typeof a.evidence);
  console.log("evidence:", JSON.stringify(a.evidence, null, 1));
  console.log("auto_seeded_from:", JSON.stringify(a.auto_seeded_from));
}
