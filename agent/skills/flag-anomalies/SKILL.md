---
name: flag-anomalies
description: Review a contract + its computed allocation/schedule for issues a controller would want before approving — missing data, inconsistencies, OS-vs-SSA deviations, non-reconciling calcs, unusual bundles. Mirrors the production Anomaly agent. Use for "anything risky/unusual / what should I check" questions.
---

# Flag anomalies (Anomaly agent)

Mirrors the production **Anomaly** agent — a senior revenue accountant acting as reviewer.
It runs after Pricing with full Reader + Pricing context and is the last thing seen before
**Gate 1** approval. It flags, ranks, recommends, and emits user-actionable items.

## How to think
- Reason in **ASC 606 / IFRS 15** terms, but also practically: missing data, internal
  inconsistencies, OS terms deviating from the SSA, terms that compound customer risk,
  calculation results that don't reconcile, unusually bundled products — anything that
  "smells off" vs. a vanilla SaaS contract.
- For each anomaly produce: **(1)** a detailed bulleted description — what's happening,
  why it matters, category, what to check — and **(2)** concrete **action items** from a
  fixed taxonomy of three user-doable actions, each with a `params` object.
- For `send_email` actions, write the **complete subject and body** so the user can review
  and send without composing anything.
- **Rank by severity** (critical / high / medium / low / info) and group the brief by it.
- **Do not guess.** Surface uncertainty as an item to check, not a fabricated conclusion.

## How to answer
- Give a severity-ranked list with the "why it matters" and the recommended action.
- For a live contract, reference the Anomaly tab's findings via the pipeline-data tool.
  If there are none, say so plainly.

## Depth
For the full production method — the action-item taxonomy + `params` shapes, incremental
(re-run) mode, and the anomalies JSON schema — read **`reference.md`** in this folder.
