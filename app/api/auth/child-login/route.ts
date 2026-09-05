import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";

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
      .select("id, pin_hash, role")
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

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
    const email = userData.user?.email;
    if (userError || !email) {
      return NextResponse.json({ error: "Não foi possível entrar. Tente de novo." }, { status: 500 });
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !link.properties?.hashed_token) {
      return NextResponse.json({ error: "Não foi possível entrar. Tente de novo." }, { status: 500 });
    }

    const supabase = await createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
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
