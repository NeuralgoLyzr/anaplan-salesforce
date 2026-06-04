/**
 * MongoDB helpers for the agent_traces collection.
 * Server-only — import only from API route handlers.
 */

import { getDb } from "@/lib/mongo";
import { Trace } from "@/lib/api/traces";

const COLLECTION = "agent_traces";

export interface TraceDoc {
  _id: string;        // = trace id
  agent_id: string;
  session_id: string;
  status: "success" | "error" | "running";
  start_time: string; // ISO string — lexicographic sort works for date comparison
  end_time: string;
  duration_ms: number;
  total_tokens: number;
  cost?: number;
  user_id?: string;
  synced_at: Date;
}

async function col() {
  const db = await getDb();
  const c = db.collection<TraceDoc>(COLLECTION);
  // Ensure indexes exist (no-op after first run)
  await c.createIndex({ start_time: -1 });
  await c.createIndex({ agent_id: 1, start_time: -1 });
  return c;
}

export async function upsertTraces(traces: Trace[]): Promise<void> {
  if (!traces.length) return;
  const c = await col();
  const now = new Date();
  await c.bulkWrite(
    traces
      .filter((t) => t.id)
      .map((t) => ({
        updateOne: {
          filter: { _id: t.id },
          update: {
            $set: {
              _id:          t.id,
              agent_id:     t.agent_id,
              session_id:   t.session_id,
              status:       t.status,
              start_time:   t.start_time,
              end_time:     t.end_time,
              duration_ms:  t.duration_ms,
              total_tokens: t.total_tokens,
              cost:         t.cost,
              user_id:      t.user_id,
              synced_at:    now,
            },
          },
          upsert: true,
        },
      })),
    { ordered: false }
  );
}

export interface QueryOptions {
  agent_id?:   string;
  start_time?: string; // ISO
  end_time?:   string; // ISO
  page:        number;
  size:        number;
}

export async function queryTraces(
  opts: QueryOptions
): Promise<{ data: Trace[]; total: number }> {
  const c = await col();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: Record<string, any> = {};
  if (opts.agent_id) q.agent_id = opts.agent_id;
  if (opts.start_time || opts.end_time) {
    q.start_time = {};
    if (opts.start_time) q.start_time.$gte = opts.start_time;
    if (opts.end_time)   q.start_time.$lte = opts.end_time;
  }

  const skip = (opts.page - 1) * opts.size;
  const [docs, total] = await Promise.all([
    c.find(q).sort({ start_time: -1 }).skip(skip).limit(opts.size).toArray(),
    c.countDocuments(q),
  ]);

  return {
    data: docs.map((d) => ({
      id:           d._id,
      agent_id:     d.agent_id,
      session_id:   d.session_id,
      status:       d.status,
      start_time:   d.start_time,
      end_time:     d.end_time,
      duration_ms:  d.duration_ms,
      total_tokens: d.total_tokens,
      cost:         d.cost,
      user_id:      d.user_id,
    })),
    total,
  };
}
