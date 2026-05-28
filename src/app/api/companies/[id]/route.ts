import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/rev-rec/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/companies/:id — full session document
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session });
}

// DELETE /api/companies/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteSession(id);
  return NextResponse.json({ ok: true });
}
