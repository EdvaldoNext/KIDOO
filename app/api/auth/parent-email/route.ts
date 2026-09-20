import { NextResponse } from "next/server";
import { familyRole, isParentRole, isPlatformAdmin, type AppClaims } from "@/lib/auth";
import { attachProfileSession, emailPasswordMatches } from "@/lib/auth-session";
import { clearSignedOut, isSecureRequest, withDevFamilySession } from "@/lib/dev-cookies";
import { createServiceClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || password.length < 8) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 400 });
  }

  try {
    const matches = await emailPasswordMatches(email, password);
    if (!matches) {
      return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const admin = createServiceClient();
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listed.error) {
      return NextResponse.json({ error: listed.error.message }, { status: 400 });
    }
    const user = listed.data.users.find((item) => item.email?.toLowerCase() === email);
    if (!user) {
      return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const claims = {
      sub: user.id,
      email: user.email,
      app_metadata: user.app_metadata,
    } as AppClaims;

    if (isPlatformAdmin(claims)) {
      return NextResponse.json(
        { error: "Conta administrativa entra em /admin/login — este login é só da família." },
        { status: 409 },
      );
    }

    const role = familyRole(claims);
    if (role === "child") {
      return NextResponse.json(
        { error: "Esta conta é de filho. Use o link e a chave que seus pais enviaram." },
        { status: 409 },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("family_id, role")
      .eq("id", user.id)
      .maybeSingle();

    const familyId = profile?.family_id ?? null;
    const parent = isParentRole(profile?.role ?? role);
    const response = NextResponse.json({
      ok: true,
      path: parent ? "/app" : "/onboarding",
    });

    const secure = isSecureRequest(request);
    if (familyId && parent) {
      withDevFamilySession(response, familyId, secure);
    }
    clearSignedOut(response, secure);

    await attachProfileSession(response, user.id);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível entrar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
