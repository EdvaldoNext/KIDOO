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

export async function PATCH(request: Request) {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  const familyId = await devFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Família não encontrada." }, { status: 400 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.reward_mode === "string") patch.reward_mode = body.reward_mode;
  if ("points_per_currency" in body) patch.points_per_currency = body.points_per_currency;
  if ("currency_amount" in body) patch.currency_amount = body.currency_amount;
  if ("reward_note" in body) patch.reward_note = body.reward_note;
  if (typeof body.location_24h_enabled === "boolean") {
    patch.location_24h_enabled = body.location_24h_enabled;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para salvar." }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin.from("families").update(patch).eq("id", familyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  const familyId = await devFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Família não encontrada." }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin.from("families").delete().eq("id", familyId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(DEV_FAMILY_COOKIE);

  return NextResponse.json({ ok: true });
}
