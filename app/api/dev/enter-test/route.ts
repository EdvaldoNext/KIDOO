import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { DEV_COOKIE_OPTIONS } from "@/lib/dev-cookies";

export async function POST() {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configuração do servidor incompleta." },
      { status: 500 },
    );
  }

  const { data: family, error } = await admin
    .from("families")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !family) {
    return NextResponse.json(
      { error: error?.message ?? "Nenhuma família de teste encontrada. Preencha o cadastro uma vez." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true, family_id: family.id });
  response.cookies.set(DEV_FAMILY_COOKIE, family.id, DEV_COOKIE_OPTIONS);
  return response;
}
