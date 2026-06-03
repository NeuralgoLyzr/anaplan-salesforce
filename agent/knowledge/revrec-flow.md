# The 7-step revenue-recognition flow (PRD)

The agent runs seven steps in order; five are automatic, two need a human sign-off.
Heavy math (steps 3 & 4) runs on the Anaplan model — the agent does not redo it itself.

1. **Detect a new contract** — watch Salesforce; pick up any new/changed contract once executed.
2. **Read it** — read the SSA + Order Schedules to work out what's bought, how much, and for how long. Order Schedules can be complex and can nullify terms in the overarching SSA.
3. **Price it** — split the total price across each item in the bundle (SSP allocation). Hard-math step → Anaplan.
4. **Schedule it** — work out which month each piece of revenue belongs in, across the contract's life. Hard-math step → Anaplan.
5. **Post it** — write the journal entries (e.g. subscription revenue booked monthly). **A person must sign off** (controller, Gate 2).
6. **Bill it** — push billing so invoices go out on the right dates for the right amounts.
7. **Flag oddities** — unusual terms (odd payment plan, rare promise) are routed to a senior accountant rather than guessed.

## Impact (why it matters)
- Time per contract: ~3 days → ~3 hours.
- 40–60% fewer math errors.
- ~3 of 6 full-time roles freed up.

## The trust feature: traceability
Clicking any figure reveals where it came from — which contract line, which calc
step, which input value. This is what separates it from a generic AI answer.
