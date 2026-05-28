// Approve Gate 1 on a session and drive Billing to capture invoice/JE shapes.
// Run: node --env-file=.env.local scripts/approve-drive.mjs [company] [port]
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const company = process.argv[2] || "BPCE";
const port = process.argv[3] || "3002";

const client = new MongoClient(uri);
await client.connect();
const s = await client.db(dbName).collection("sessions").findOne({ $or: [{ company_name: company }, { session_id: company }] });
await client.close();
if (!s) { console.log(`No session for ${company}`); process.exit(0); }
const id = s.session_id;

if (s.status !== "gate1") {
  console.log(`Session status is "${s.status}", not gate1 — cannot approve.`);
  process.exit(0);
}

console.log("POST gate1 approve…");
const ap = await fetch(`http://localhost:${port}/api/companies/${id}/gate1`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ decision: "approve", approver_name: "Validation Bot", notes: "automated check" }),
});
const apJson = await ap.json();
console.log("gate1 HTTP", ap.status, "→ status:", apJson.session?.status, apJson.error ?? "");

const terminal = new Set(["gate2", "complete", "failed", "rejected"]);
let last = "";
let final = apJson.session;
for (let i = 0; i < 60; i++) {
  if (final && terminal.has(final.status)) break;
  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(`http://localhost:${port}/api/companies/${id}/poll`, { method: "POST" });
  if (!res.ok) { console.log(`poll ${i} HTTP ${res.status}`); continue; }
  const { session } = await res.json();
  final = session;
  if (session.status !== last) {
    console.log(`[${i}] status=${session.status} billing=${session.agent_outputs.billing.status}`);
    last = session.status;
  }
}

const keys = (o) => (o && typeof o === "object" ? Object.keys(o) : null);
console.log(`\nFINAL status=${final.status}`);
for (const e of final.errors ?? []) console.log(`  error: ${e.code} (${e.agent}) — ${e.detail}`);
const bj = final.agent_outputs.billing.json;
console.log("billing.json keys:", keys(bj));
if (bj) {
  const invoices = bj.invoices ?? bj.bills;
  const jes = bj.journal_entries ?? bj.journalEntries ?? bj.jes ?? bj.entries;
  console.log("invoices:", Array.isArray(invoices) ? `array[${invoices.length}]` : typeof invoices);
  if (Array.isArray(invoices) && invoices[0]) {
    console.log("  invoice[0] keys:", keys(invoices[0]));
    console.log("  invoice[0] sample:", JSON.stringify(invoices[0]).slice(0, 400));
  }
  console.log("journal_entries:", Array.isArray(jes) ? `array[${jes.length}]` : typeof jes);
  if (Array.isArray(jes) && jes[0]) {
    console.log("  je[0] keys:", keys(jes[0]));
    const lines = jes[0].lines ?? jes[0].entries ?? jes[0].rows ?? jes[0].postings;
    console.log("  je[0].lines:", Array.isArray(lines) ? `array[${lines.length}]` : typeof lines, "line[0] keys:", keys(Array.isArray(lines) ? lines[0] : null));
    console.log("  je[0] sample:", JSON.stringify(jes[0]).slice(0, 500));
  }
  console.log("g2_per_bill:", JSON.stringify(final.gates.g2_per_bill));
}
