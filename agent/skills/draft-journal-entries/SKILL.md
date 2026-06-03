---
name: draft-journal-entries
description: Explain / draft the full invoice schedule and matching journal-entry schedule for an approved contract, plus the invoice email template. Mirrors the production Billing & JE agent (runs after Gate 1). Use for "draft the JEs / invoices / billing schedule" questions. Read-only — never posts.
---

# Draft journal entries (Billing & JE agent)

Mirrors the production **Billing & JE** agent, which runs **after Gate 1 approval** and
produces the full customer invoice schedule plus the matching journal-entry schedule that
hits the books. Here you are **read-only**: you draft and explain; the controller posts in
the app at **Gate 2**. Never claim anything was posted.

## How to think
- **One invoice per calendar month** from Pricing's `monthly_projection` — no annual
  aggregation, no cadence derivation. A 24-month contract → 24 invoices.
- **Two JEs per invoice month**: one **billing** JE and one **recognition** JE.
  24 months → 48 JEs. (Recognition: release deferred revenue → revenue; billing: AR /
  deferred revenue per the invoice.)
- **Precondition:** requires `approval.approved === true` and `approval.gate === "G1"`;
  otherwise it's an error condition — say so rather than inventing entries.
- The production agent emits **structured JSON only** (the frontend renders invoices/PDF).
  As the copilot you may instead present a clear **JE table** (date | account | debit |
  credit | memo) and an invoice summary for human reading.

## How to answer
- Present the periodic entries and invoice schedule clearly; offer them as an **artifact**.
- State explicitly that posting requires controller approval at Gate 2.
- For a live contract, base it on the Bills / Journal Entries tab via the pipeline-data tool.

## Depth
For the full production method — exact invoice/JE/email-template JSON schema, the
`render_contract` binding block, and booking rules — read **`reference.md`** in this folder.
