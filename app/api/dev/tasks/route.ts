import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/backend/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { createFamilyTask, parseTaskBody } from "@/lib/routines";

async function devFamilyId() {
  const cookieStore = await cookies();
  const familyId = cookieStore.get(DEV_FAMILY_COOKIE)?.value;
  if (familyId) return familyId;

  const admin = createServiceClient();
  const { data } = await admin
    .from("families")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function devOwnerId(admin: ReturnType<typeof createServiceClient>, familyId: string) {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("family_id", familyId)
    .in("role", ["owner", "parent"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function POST(request: Request) {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  const familyId = await devFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Crie uma família em /cadastro primeiro." }, { status: 400 });
  }

  const admin = createServiceClient();
  const ownerId = await devOwnerId(admin, familyId);
  if (!ownerId) {
    return NextResponse.json({ error: "Nenhum pai encontrado na família." }, { status: 400 });
  }

  const parsed = parseTaskBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await createFamilyTask(familyId, ownerId, parsed.value);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, created_today: result.createdToday, repeat: parsed.value.repeat !== "once" });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a tarefa." }, { status: 500 });
  }
}
