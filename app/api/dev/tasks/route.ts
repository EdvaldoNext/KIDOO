import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_BYPASS_AUTH } from "@/lib/config";

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

  const body = (await request.json()) as {
    title?: string;
    child_id?: string;
    kind?: "points" | "reminder";
    weight?: number;
    description?: string;
    due_at?: string;
    require_photo?: boolean;
  };

  const title = (body.title ?? "").trim();
  const childId = body.child_id ?? "";
  const kind = body.kind ?? "points";

  if (!title || !childId) {
    return NextResponse.json({ error: "Título e filho são obrigatórios." }, { status: 400 });
  }

  const requirePhoto = kind === "points" ? true : Boolean(body.require_photo);
  const { error } = await admin.from("tasks").insert({
    family_id: familyId,
    created_by: ownerId,
    assigned_child_id: childId,
    kind,
    title,
    description: body.description?.trim() || null,
    weight: kind === "points" ? Number(body.weight ?? 1) : 0,
    due_at: body.due_at || null,
    require_photo: requirePhoto,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
