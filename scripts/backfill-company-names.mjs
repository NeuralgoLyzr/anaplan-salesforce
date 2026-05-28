#!/usr/bin/env node
// One-shot fix for Salesforce-sourced sessions whose company_name ended up as a
// raw Salesforce Account ID (the "001..." 18-char ID) because the initial ingest
// couldn't resolve Account.Name. Rebuilds the name from uploaded_files using the
// same filename heuristic the live ingest now uses as a fallback.
//
// Run:  node --env-file=.env.local scripts/backfill-company-names.mjs
// Add --dry to preview without writing.

import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGODB_DB || "rev_rec";
const DRY = process.argv.includes("--dry");

if (!URI) {
  console.error("MONGODB_URI is not set. Hint: run with `node --env-file=.env.local scripts/backfill-company-names.mjs`");
  process.exit(1);
}

// Salesforce IDs are 15 or 18 alphanumeric chars and Account IDs start with "001".
// Don't be aggressive — only rename when we're confident the current name is a raw ID.
function looksLikeSalesforceId(name) {
  if (!name || typeof name !== "string") return false;
  return /^001[a-zA-Z0-9]{12,15}$/.test(name.trim());
}

// Mirrors deriveNameFromFiles in src/lib/rev-rec/createFromPdfs.ts. Standalone
// so this script has no project imports / build step to worry about.
function deriveNameFromFiles(filenames) {
  const stems = filenames.map((f) => f.replace(/\.[^.]+$/, ""));
  if (stems.length === 0) return null;
  if (stems.length === 1) return cleanup(stems[0]);

  let prefix = stems[0];
  for (const s of stems.slice(1)) {
    while (prefix && !s.toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
    }
  }
  const cleaned = cleanup(prefix);
  return cleaned.length >= 3 ? cleaned : cleanup(stems[0]);
}

function cleanup(s) {
  return (
    s
      .replace(/[_\-]+/g, " ")
      .replace(/\b(ssa|os|order|schedule|master|agreement|contract|subscription|final|signed|v\d+)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || ""
  );
}

const client = new MongoClient(URI);
await client.connect();
const c = client.db(DB).collection("sessions");

const candidates = await c
  .find(
    { source: "salesforce" },
    { projection: { session_id: 1, company_name: 1, "uploaded_files.filename": 1, salesforce_account_id: 1 } },
  )
  .toArray();

let touched = 0;
for (const s of candidates) {
  if (!looksLikeSalesforceId(s.company_name)) continue;
  const filenames = (s.uploaded_files ?? []).map((f) => f.filename).filter(Boolean);
  const derived = deriveNameFromFiles(filenames);
  if (!derived || derived.length < 2) {
    console.log(`SKIP ${s.session_id}: no usable filename (had ${filenames.length} file(s))`);
    continue;
  }
  console.log(`${DRY ? "DRY  " : "FIX  "} ${s.session_id}: "${s.company_name}" → "${derived}"`);
  if (!DRY) {
    await c.updateOne(
      { session_id: s.session_id },
      {
        $set: { company_name: derived, updated_at: new Date().toISOString() },
        $push: {
          audit_log: {
            ts: new Date().toISOString(),
            event: "company_name_backfilled",
            detail: `was raw account id "${s.company_name}", now "${derived}" (from filenames)`,
          },
        },
      },
    );
    touched += 1;
  }
}

console.log(`\nDone. Scanned ${candidates.length} Salesforce session(s). ${DRY ? "Would update" : "Updated"} ${DRY ? candidates.filter((s) => looksLikeSalesforceId(s.company_name)).length : touched}.`);
await client.close();
