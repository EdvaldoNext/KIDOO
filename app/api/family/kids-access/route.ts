import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { isParentRole } from "@/lib/auth";
import { ensureKidsAccessKey, KIDS_ENTRY_PATH } from "@/lib/kids-access";

async function resolveParentFamilyId() {
  if (DEV_BYPASS_AUTH) {
    const cookieStore = await cookies();
    let familyId = cookieStore.get(DEV_FAMILY_COOKIE)?.value;
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

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const role = data?.claims?.app_metadata?.role;
  const familyId = data?.claims?.app_metadata?.family_id as string | undefined;
  if (!familyId || !isParentRole(role)) return null;
  return familyId;
}

export async function GET() {
  const familyId = await resolveParentFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Só pais podem ver o link dos filhos." }, { status: 403 });
  }

  try {
    const key = await ensureKidsAccessKey(createServiceClient(), familyId);
    return NextResponse.json({ key, path: KIDS_ENTRY_PATH });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar a chave da família." }, { status: 500 });
  }
}
