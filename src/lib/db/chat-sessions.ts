/**
 * MongoDB helpers for the console_chat_sessions collection.
 * SERVER-ONLY — import only from API route handlers.
 */

import { getDb } from "@/lib/mongo";
import type { ChatMessage } from "@/hooks/use-chat-stream";

const COLLECTION = "console_chat_sessions";

export interface ChatSessionDoc {
  _id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

async function col() {
  const db = await getDb();
  const c = db.collection<ChatSessionDoc>(COLLECTION);
  await c.createIndex({ updatedAt: -1 });
  return c;
}

export async function listChatSessions(): Promise<ChatSessionDoc[]> {
  const c = await col();
  return c.find({}).sort({ updatedAt: -1 }).limit(100).toArray();
}

export async function upsertChatSession(session: ChatSessionDoc): Promise<void> {
  const { _id, ...fields } = session;
  const c = await col();
  await c.updateOne(
    { _id },
    { $set: fields },
    { upsert: true }
  );
}

export async function deleteChatSession(id: string): Promise<void> {
  const c = await col();
  await c.deleteOne({ _id: id });
}

export async function deleteAllChatSessions(): Promise<void> {
  const c = await col();
  await c.deleteMany({});
}
