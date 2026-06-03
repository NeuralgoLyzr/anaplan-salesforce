# Anaplan model — where the hard math lives

The two hard-math steps — **price it** (SSP allocation) and **schedule it** (monthly
revenue) — run on an Anaplan model, not in the LLM. Anaplan holds the calculation
logic; the agent feeds it inputs and reads back results.

- **Workspace:** Polaris CoModeler (the shared Anaplan workspace for these POCs).
- **Model:** IFP — Integrated Financial Planning (revenue-recognition math built in).
- **Access:** via a hosted **Anaplan MCP** server (bearer-token auth) exposing read
  and write tools. The Lyzr agents call those tools for allocation and scheduling.

## What this means for answers
- When explaining an allocation or a monthly schedule, attribute the math to the
  Anaplan model — that is the system of record for those numbers.
- The copilot can explain *method* and *interpretation*; the authoritative figures
  come from Anaplan via the Pricing agent's run, surfaced on the contract's
  **Revenue Plan** tab.

> Note: in the current build the "Anaplan MCP connected" badge is indicative; the
> live MCP wiring for steps 3 & 4 is an in-progress integration.
