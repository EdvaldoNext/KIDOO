import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { familyRole, type AppClaims } from "@/lib/auth";
import { findFamilyByKidsKey, signInAsChild } from "@/lib/kids-access";
import { withDevKidsSession } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  const body = (await request.json()) as { key?: string; child_id?: string };
  const childId = body.child_id ?? "";
  const key = body.key ?? "";

  if (!childId) {
    return NextResponse.json({ error: "Escolha quem está entrando." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data: child } = await admin
      .from("profiles")
      .select("id, family_id, role")
      .eq("id", childId)
      .eq("role", "child")
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado." }, { status: 404 });
    }

    let allowedFamilyId: string | null = null;

    if (key) {
      const family = await findFamilyByKidsKey(admin, key);
      if (family && family.id === child.family_id) allowedFamilyId = family.id;
    } else if (DEV_BYPASS_AUTH) {
      const cookieStore = await cookies();
      const fromCookie = cookieStore.get(DEV_FAMILY_COOKIE)?.value;
      if (fromCookie === child.family_id) allowedFamilyId = child.family_id;
    } else {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      const sessionFamily = data?.claims?.app_metadata?.family_id as string | undefined;
      if (familyRole(data?.claims as AppClaims | undefined) === "child" && sessionFamily === child.family_id) {
        allowedFamilyId = child.family_id;
      }
    }

    if (!allowedFamilyId) {
      return NextResponse.json({ error: "Chave inválida." }, { status: 401 });
    }

    if (DEV_BYPASS_AUTH) {
      return withDevKidsSession(NextResponse.json({ ok: true }), allowedFamilyId, child.id);
    }

    const tokenHash = await signInAsChild(admin, child.id);
    const supabase = await createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });

    if (otpError) {
      return NextResponse.json({ error: "Não foi possível entrar. Tente de novo." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Login de filho ainda não está configurado no servidor." },
      { status: 500 },
    );
  }
}
