import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { isSecureRequest, withDevKidsSession } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string; pin?: string };
  const code = (body.code ?? "").trim().toUpperCase();
  const pin = (body.pin ?? "").trim();

  if (!/^KIDOO-[A-Z0-9]{4}$/.test(code) || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Código ou PIN inválidos." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, pin_hash, role, family_id")
      .eq("invite_code", code)
      .eq("role", "child")
      .maybeSingle();

    if (error || !profile?.pin_hash) {
      return NextResponse.json({ error: "Código ou PIN inválidos." }, { status: 401 });
    }

    const { data: matched } = await admin.rpc("verify_child_pin", {
      p_id: profile.id,
      p_pin: pin,
    });

    if (!matched) {
      return NextResponse.json({ error: "Código ou PIN inválidos." }, { status: 401 });
    }

    return withDevKidsSession(
      NextResponse.json({ ok: true }),
      profile.family_id,
      profile.id,
      isSecureRequest(request),
    );
  } catch {
    return NextResponse.json(
      { error: "Login de filho ainda não está configurado no servidor." },
      { status: 500 },
    );
  }
}
