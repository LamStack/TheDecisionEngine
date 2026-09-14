import { NextResponse } from "next/server";
import { getAuditById } from "@/lib/engine/audit";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getAuditById(id);
  if (!entry) {
    return NextResponse.json({ error: `No audit entry with id "${id}".` }, { status: 404 });
  }
  return NextResponse.json(entry);
}
