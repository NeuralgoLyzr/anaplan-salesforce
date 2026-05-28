import { createHash } from "crypto";
import type { DocType } from "./types";

// Filename token heuristics.
const SSA_NAME = /\b(ssa|master|msa|framework|contrat|agreement|subscription(?!\s*order)|services?\s*agreement)\b/i;
const OS_NAME = /\b(os|order|schedule|bon\s*de\s*commande|subscription\s*order|quote|sow)\b/i;

// Content heuristics — legal boilerplate vs pricing tables.
const SSA_CONTENT = [
  "limitation of liability", "intellectual property", "governing law",
  "confidentiality", "indemnif", "warranties", "data protection", "security annex",
  "term and termination", "responsabilité", "propriété intellectuelle", "droit applicable",
];
const OS_CONTENT = [
  "order schedule", "subscription term", "unit price", "quantity", "qty",
  "annual fee", "total fee", "billing frequency", "net total", "list price",
  "subscription period", "bon de commande", "prix unitaire", "quantité",
];

export interface DocClassification {
  type: DocType;
  ssaScore: number; // higher = more SSA-like
  osScore: number;  // higher = more OS-like
}

export function classifyDoc(filename: string, text: string): DocClassification {
  const name = filename.toLowerCase();
  const body = text.toLowerCase();

  let ssaScore = 0;
  let osScore = 0;

  if (SSA_NAME.test(name)) ssaScore += 3;
  if (OS_NAME.test(name)) osScore += 3;

  for (const k of SSA_CONTENT) if (body.includes(k)) ssaScore += 1;
  for (const k of OS_CONTENT) if (body.includes(k)) osScore += 1;

  // Dense pricing/number tables are a strong OS signal.
  const currencyHits = (body.match(/[€$£]\s?\d|\d[.,]\d{2}\b/g) ?? []).length;
  if (currencyHits > 8) osScore += 2;

  let type: DocType = "unknown";
  if (ssaScore > osScore) type = "SSA";
  else if (osScore > ssaScore) type = "OS";

  return { type, ssaScore, osScore };
}

// Stable per-document id, consistent across re-uploads of the same file.
export function makeDocId(type: DocType, filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "");
  const hash = createHash("sha1").update(filename).digest("hex").slice(0, 8);
  const prefix = type === "unknown" ? "DOC" : type;
  // Slug the stem for readability but keep the hash for uniqueness.
  const slug = stem.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "doc";
  return `${prefix}_${slug}_${hash}`;
}

// Assigns SSA/OS roles across a set of documents.
// Rules:
//  - Single document: leave its classification (the orchestrator treats a
//    lone self-contained agreement as order_schedules[0] with ssa=null).
//  - Multiple: the most SSA-like becomes the SSA (if it actually looks like one),
//    the rest become OS. Ties / ambiguity fall back to "unknown" for UI tagging.
export function assignDocTypes(
  docs: { filename: string; classification: DocClassification }[]
): DocType[] {
  if (docs.length === 0) return [];
  if (docs.length === 1) return [docs[0].classification.type];

  // Pick the single best SSA candidate.
  let bestIdx = -1;
  let bestScore = 0;
  docs.forEach((d, i) => {
    const lean = d.classification.ssaScore - d.classification.osScore;
    if (lean > bestScore) {
      bestScore = lean;
      bestIdx = i;
    }
  });

  return docs.map((d, i) => {
    if (i === bestIdx) return "SSA";
    // Everything else defaults to OS unless it itself leans SSA strongly.
    return d.classification.type === "SSA" ? "OS" : (d.classification.type === "unknown" ? "OS" : d.classification.type);
  });
}
