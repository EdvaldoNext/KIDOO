import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { familyRole, type AppClaims } from "@/lib/auth";
import { findFamilyByKidsKey, listFamilyChildren } from "@/lib/kids-access";

async function childrenForFamily(familyId: string) {
  const admin = createServiceClient();
  const children = await listFamilyChildren(admin, familyId);
  return NextResponse.json({ family_id: familyId, children });
}

export async function GET() {
  try {
    if (DEV_BYPASS_AUTH) {
      const cookieStore = await cookies();
      const familyId = cookieStore.get(DEV_FAMILY_COOKIE)?.value;
      if (!familyId) {
        return NextResponse.json({ error: "Digite a chave da família." }, { status: 401 });
      }
      return childrenForFamily(familyId);
    }

    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const familyId = data?.claims?.app_metadata?.family_id as string | undefined;
    const role = familyRole(data?.claims as AppClaims | undefined);
    if (!familyId || role !== "child") {
      return NextResponse.json({ error: "Digite a chave da família." }, { status: 401 });
    }
    return childrenForFamily(familyId);
  } catch {
    return NextResponse.json({ error: "Não foi possível listar os filhos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { key?: string };
  const key = body.key ?? "";

  try {
    const admin = createServiceClient();
    const family = await findFamilyByKidsKey(admin, key);
    if (!family) {
      return NextResponse.json({ error: "Chave inválida." }, { status: 401 });
    }

    const children = await listFamilyChildren(admin, family.id);
    return NextResponse.json({ family_id: family.id, children });
  } catch {
    return NextResponse.json({ error: "Não foi possível abrir a porta da família." }, { status: 500 });
  }
}
