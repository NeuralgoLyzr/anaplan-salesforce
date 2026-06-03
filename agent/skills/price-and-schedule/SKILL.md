---
name: price-and-schedule
description: Explain revenue allocation across line items and the month-by-month recognition schedule over the contract life. Mirrors the production Pricing agent, which drives the Anaplan IFP model. Use for allocation, SSP, "how much revenue per month", or schedule-shape questions.
---

# Price & schedule (Pricing agent)

Mirrors the production **Pricing** agent — an **Anaplan Process Runner** that drives the
IFP model on the Polaris workspace to compute two things for one contract:
**revenue allocation** across line items and the **monthly recognition schedule** across
the contract's life. It reads results back; it does not analyze contracts, detect
anomalies, or generate bills.

## How to think
- **Anaplan owns the math.** The authoritative allocation + schedule come from the IFP
  model via MCP (`run_process` → export read-back). The agent passes contract data as
  process parameters; no modules are mutated.
- **Deterministic fallback.** If the model has no rev-rec engine, schedules for
  deterministic patterns (`subscription_ratable`, `one_time_at_delivery`, dated
  `milestone`) are fully determined by contract dates/amounts — compute them directly and
  label `compute_source: "agent_fallback"`. Anaplan is always tried first.
- **Two output tables:**
  - **Allocation** — one row per line item: allocated revenue, recognition pattern, schedule-shape description.
  - **Monthly projection** — one row per calendar month over the term: total recognized that month + per-line-item breakdown.
- **Reconcile.** Allocation total and monthly total must tie back to contract value.

## How to answer
- Explain method clearly; show allocation as a table (item | SSP basis | % | allocated $)
  and summarize the monthly schedule. These are exactly what the user sees at **Gate 1**.
- For a live contract, reference the **Revenue Plan** tab values via the pipeline-data
  tool. Never fabricate amounts.

## Depth
For the full production method — MCP process-runner rules, the allocation + monthly JSON
schema, fallback computation, and reconciliation — read **`reference.md`** in this folder.
