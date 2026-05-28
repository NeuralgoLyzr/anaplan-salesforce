// Verify jsonrepair fixes the billing JSON and dump invoice/JE shapes.
import { MongoClient } from "mongodb";
import { jsonrepair } from "jsonrepair";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const client = new MongoClient(uri);
await client.connect();
const s = await client.db(dbName).collection("sessions").findOne({ session_id: "59996f0c-794e-422b-93ad-c25867b365cd" });
await client.close();
const text = s.agent_outputs.billing.raw;

const FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/gi;
let m, fences = [];
while ((m = FENCE_RE.exec(text)) !== null) fences.push(m[1].trim());

let json = null;
for (let i = fences.length - 1; i >= 0; i--) {
  try { json = JSON.parse(jsonrepair(fences[i])); break; } catch {}
}

const keys = (o) => (o && typeof o === "object" ? Object.keys(o) : null);
console.log("parsed top-level keys:", keys(json));
const invoices = json.invoices ?? json.bills;
const jes = json.journal_entries ?? json.journalEntries ?? json.jes ?? json.entries;
console.log("\ninvoices:", Array.isArray(invoices) ? `array[${invoices.length}]` : typeof invoices);
if (Array.isArray(invoices) && invoices[0]) {
  console.log("  invoice[0] keys:", keys(invoices[0]));
  const { markdown, ...rest } = invoices[0];
  console.log("  invoice[0] (no markdown):", JSON.stringify(rest).slice(0, 500));
  console.log("  invoice[0].markdown length:", markdown?.length);
}
console.log("\njournal_entries:", Array.isArray(jes) ? `array[${jes.length}]` : typeof jes);
if (Array.isArray(jes) && jes[0]) {
  console.log("  je[0] keys:", keys(jes[0]));
  const lines = jes[0].lines ?? jes[0].entries ?? jes[0].rows ?? jes[0].postings;
  console.log("  je[0].lines line[0] keys:", keys(Array.isArray(lines) ? lines[0] : null));
  console.log("  je[0].lines line[0]:", JSON.stringify(Array.isArray(lines) ? lines[0] : null));
}
