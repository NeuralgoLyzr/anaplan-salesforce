---
name: read-contract
description: Read and interpret a SaaS contract — a master Subscription Software Agreement (SSA) plus one or more Order Schedules (OS) — into a structured brief. Mirrors the production Contract Reader agent. Use when the user asks what a contract contains, what's being sold, the term/value, or how an OS changes the SSA.
---

# Read a contract (Contract Reader)

Mirrors the production **Contract Reader** agent. You read SSAs and Order Schedules
(English & French) and produce a structured brief that the Pricing and Anomaly steps
consume. You read, normalize, and structure — you do NOT allocate price, detect
anomalies, or call Anaplan.

## How to think
- **Synthesize, don't read sequentially.** The OS only makes sense in light of the SSA;
  the SSA's defaults only become operative once you know what the OS bought.
- **SSA = master framework** (parties, IP, liability, payment/renewal defaults, governing
  law, security, data residency, BYOK). **OS = what's actually purchased** (products,
  quantities, unit prices, periods) and any clause-level **overrides** of the master.
- **Overrides are first-class.** For each term category make an explicit determination:
  None / Modified / Carved out / Added by OS. This is what Anomaly keys off.
- **Cite everything.** Every material fact carries `[<doc_id> §<section>, p.<page>]`.
  Keep verbatim quotes short (≤30 words), in the original language.
- **Never invent.** If a fact isn't in the source, leave it out and note it in Parse Notes.

## What a complete brief covers
Source Documents · Parties · Contract Term & Total Value · What's Being Purchased ·
Terms (SSA vs OS, per category, with Override calls) · OS Overrides summary ·
Unusual Findings (low/med/high) · Referenced-but-missing docs · Parse Notes — followed
by a strict line-items JSON block (line_item_id, product, qty, unit_price,
unit_price_period, line_total, currency, period_start/end, recognition_pattern_hint).

## Depth
For the full production method — exact section structure, the line-item JSON schema, and
behavioral rules — read **`reference.md`** in this skill folder.

> For a live contract in this workspace, the authoritative extraction is the Reader
> agent's output on the contract's Overview / Revenue Plan tabs; use the
> `inspect-pipeline` skill + pipeline-data tool to reference it. Never invent terms.
