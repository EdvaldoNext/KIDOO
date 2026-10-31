import { NextResponse } from "next/server";
import { attachProfileSession, syncProfileAuthClaims } from "@/lib/auth-session";
import { authAdmin, findUserById, setPassword } from "@/lib/backend/auth-users";
import { consumeResetToken } from "@/lib/backend/password-reset";
import { createServiceClient } from "@/lib/backend/admin";
import { clearSignedOut, isSecureRequest, withDevFamilySession } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < 8) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }

  try {
    const userId = await consumeResetToken(token);
    if (!userId || !(await findUserById(userId))) {
      return NextResponse.json({ error: "Link vencido ou já usado. Peça um novo e-mail." }, { status: 400 });
    }

    await setPassword(userId, password);
    await authAdmin.updateUserById(userId, { email_confirm: true });
    await syncProfileAuthClaims(userId);

    const { data: profile } = await createServiceClient()
      .from("profiles")
      .select("family_id, role")
      .eq("id", userId)
      .maybeSingle();

    const secure = isSecureRequest(request);
    const parent = profile?.role === "owner" || profile?.role === "parent";
    const response = NextResponse.json({ ok: true, path: parent ? "/app" : "/onboarding" });
    if (profile?.family_id && parent) withDevFamilySession(response, profile.family_id, secure);
    clearSignedOut(response, secure);
    await attachProfileSession(response, userId, secure);
    return response;
  } catch (error) {
    console.error("reset-password", error);
    return NextResponse.json({ error: "Não foi possível salvar a senha. Tente de novo." }, { status: 500 });
  }
}
