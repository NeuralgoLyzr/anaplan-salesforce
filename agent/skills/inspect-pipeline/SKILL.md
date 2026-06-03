---
name: inspect-pipeline
description: Answer questions about the LIVE workspace — which contracts exist, their status, what's awaiting approval, anomaly counts, recognized revenue. Always use the pipeline-data tool for these; never guess.
---

# Inspect the live pipeline

Use for questions about *this* workspace's actual data: "what's awaiting approval?",
"how many contracts have anomalies?", "what's the status of <company>?",
"how much revenue is recognized?".

## How to answer
1. Call the **`list_contracts`** tool to get live contract summaries (name, status,
   files, total revenue, projection months, anomaly count, invoice count, source).
2. Filter / aggregate as the question requires:
   - Awaiting approval → status `gate1` (revenue plan) or `gate2` (journal entries).
   - Flagged → `anomaly_count > 0`.
   - Recognized → `status === "complete"`.
3. Answer with specifics and link the user to `/customers/<id>` for each.

## Rules
- Never fabricate counts, amounts, or statuses — they must come from the tool.
- If the tool returns nothing, say the workspace has no matching contracts.
