// Per-session in-process lock so the background driver and the per-page poll
// never run drive() concurrently for the same session. Without this, both could
// see an agent in "pending" state, both submit, and the second submission
// orphans the first task_id.
//
// This is best-effort: it only deduplicates within a single Node process. With
// multiple Next.js instances behind a load balancer you'd want a Mongo-backed
// lease (findOneAndUpdate on a lock field), but for this single-process dev/
// worker setup an in-memory Map is enough.

const inFlight = new Map<string, Promise<void>>();

export async function withDriveLock(sessionId: string, fn: () => Promise<void>): Promise<void> {
  const existing = inFlight.get(sessionId);
  if (existing) {
    // Someone else is already driving this session — let them finish and skip
    // doing it again. Their drive() saw fresh state and our redundant call
    // wouldn't have advanced anything.
    await existing;
    return;
  }
  const p = (async () => {
    try {
      await fn();
    } finally {
      inFlight.delete(sessionId);
    }
  })();
  inFlight.set(sessionId, p);
  await p;
}
