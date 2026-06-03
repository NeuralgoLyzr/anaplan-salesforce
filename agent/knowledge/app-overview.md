# App overview — Anaplan Revenue Recognition (powered by Lyzr)

This app turns a signed customer contract into an ASC 606 revenue schedule and the
journal entries that feed the books — automatically, in minutes, under human approval.
It replaces ~3 days of manual work per contract for a revenue accountant.

## Who uses it
- **Revenue accountants / deferred-revenue analysts** — daily operators.
- **Controllers** — own the books; the mandatory approver before anything posts.
- **CFOs** — faster close, freed-up headcount.

## The four pipeline agents (production automation)
1. **Reader** — reads the SSA + Order Schedules; extracts what's sold, pricing, term, special terms.
2. **Pricing** — allocates the bundle price across performance obligations (SSP) and builds the monthly revenue schedule. Heavy math runs on the **Anaplan model**.
3. **Anomaly** — flags unusual terms for a senior accountant instead of guessing. Non-fatal.
4. **Billing** — generates invoices and journal entries from the approved plan.

## The two human approval gates
- **Gate 1 — Revenue plan**: a person approves the allocation + monthly schedule.
- **Gate 2 — Journal entries / posting**: the controller signs off before anything posts. Per-invoice approvals live here too.

## Pages
- **Dashboard** (`/dashboard`) — cockpit: insights, active contracts, the approval queue.
- **Customers** (`/`) — the full contract list / work queue.
- **Customer workspace** (`/customers/[id]`) — per-contract: Overview, Revenue Plan, Anomaly, Bills, Journal Entries, Audit; the progress timeline; gate approval panels; contract PDF viewer.
- **Agent Console** (`/console`) — this copilot.
- **Agents** (`/agents/*`) — per-agent views (Reader, Pricing, Anomaly, Billing).

## Integrations
- **Salesforce** — contracts + their PDFs are auto-detected when executed.
- **Anaplan (MCP)** — holds the allocation + scheduling math.
- **LlamaParse** — PDF text extraction (unpdf fallback).
- **AWS SES** — outbound email for anomaly actions / invoices.
- **MongoDB** — stores each contract's session (status, agent outputs, gates, audit log).
