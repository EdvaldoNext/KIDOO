import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/backend/admin";
import { requireParentActor } from "@/lib/parent-family";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const actor = await requireParentActor();
  if (!actor?.parentId) {
    return NextResponse.json({ error: "Só pais podem mudar uma repetição." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown; active?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!UUID_RE.test(id) || body?.active !== false) {
    return NextResponse.json({ error: "Não foi possível parar esta repetição." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("task_routines")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("family_id", actor.familyId)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Repetição não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível parar a repetição." }, { status: 500 });
  }
}
