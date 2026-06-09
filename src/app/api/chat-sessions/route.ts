import { NextRequest, NextResponse } from "next/server";
import { listChatSessions, upsertChatSession, deleteAllChatSessions } from "@/lib/db/chat-sessions";

export async function GET() {
  try {
    const sessions = await listChatSessions();
    return NextResponse.json(sessions.map((s) => ({ ...s, id: s._id })));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, messages, createdAt, updatedAt } = body;
    if (!id || !messages) {
      return NextResponse.json({ error: "id and messages are required" }, { status: 400 });
    }
    await upsertChatSession({ _id: id, title, messages, createdAt, updatedAt });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await deleteAllChatSessions();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
