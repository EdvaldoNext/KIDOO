import { NextResponse } from "next/server";
import { createClient } from "@/lib/backend/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { family_id?: unknown; status?: unknown } | null;
  const familyId = typeof body?.family_id === "string" ? body.family_id : "";
  const status = body?.status === "active" || body?.status === "disabled" ? body.status : null;
  if (!familyId || !status) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const db = await createClient();
  const { error } = await db.rpc("set_family_status", { p_family_id: familyId, p_status: status });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === "forbidden" ? 403 : 400 });
  }
  return NextResponse.json({ ok: true });
}
