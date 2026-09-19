import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_COOKIE_OPTIONS } from "@/lib/dev-cookies";
import { findFamilyByParentKeys } from "@/lib/parent-invite";
import { signInAsChild } from "@/lib/kids-access";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    kids_access_key?: unknown;
    parent_access_key?: unknown;
  } | null;

  const kidsAccessKey = typeof body?.kids_access_key === "string" ? body.kids_access_key : "";
  const parentAccessKey = typeof body?.parent_access_key === "string" ? body.parent_access_key : "";

  try {
    const admin = createServiceClient();
    const family = await findFamilyByParentKeys(admin, kidsAccessKey, parentAccessKey);
    if (!family) {
      return NextResponse.json({ error: "Chaves inválidas. Use CASA e PAIS desta família." }, { status: 401 });
    }

    if (DEV_BYPASS_AUTH) {
      const response = NextResponse.json({ ok: true, family_id: family.id });
      response.cookies.set(DEV_FAMILY_COOKIE, family.id, DEV_COOKIE_OPTIONS);
      return response;
    }

    const { data: parent } = await admin
      .from("profiles")
      .select("id")
      .eq("family_id", family.id)
      .in("role", ["owner", "parent"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!parent?.id) {
      return NextResponse.json({ error: "Esta família ainda não tem responsável." }, { status: 404 });
    }

    const tokenHash = await signInAsChild(admin, parent.id);
    const supabase = await createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });

    if (otpError) {
      return NextResponse.json({ error: "Não foi possível entrar. Tente de novo." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, family_id: family.id });
  } catch {
    return NextResponse.json({ error: "Não foi possível abrir o painel dos pais." }, { status: 500 });
  }
}
