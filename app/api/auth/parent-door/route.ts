import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { attachProfileSession } from "@/lib/auth-session";
import { clearSignedOut, isSecureRequest, withDevFamilySession } from "@/lib/dev-cookies";
import { findFamilyByParentKeys } from "@/lib/parent-invite";

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

    const secure = isSecureRequest(request);
    const response = clearSignedOut(
      withDevFamilySession(
        NextResponse.json({ ok: true, family_id: family.id }),
        family.id,
        secure,
      ),
      secure,
    );

    if (DEV_BYPASS_AUTH) return response;

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

    await attachProfileSession(response, parent.id);
    return response;
  } catch (error) {
    console.error("parent-door", error);
    const message = error instanceof Error ? error.message : "Não foi possível abrir o painel dos pais.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
