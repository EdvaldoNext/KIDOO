import { NextResponse } from "next/server";
import { attachProfileSession, emailPasswordMatches } from "@/lib/auth-session";
import { authAdmin, findUserByEmail } from "@/lib/backend/auth-users";
import { getDb } from "@/lib/backend/db";
import { clearSignedOut, isSecureRequest } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
  }

  try {
    if (!(await emailPasswordMatches(email, password))) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const listed = await getDb().execute({ sql: "SELECT 1 FROM platform_admins WHERE user_id = ?", args: [user.id] });
    const isAdmin = user.app_metadata.platform_admin === true || listed.rows.length > 0;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Esta conta não é administrativa. Use o login da família." },
        { status: 403 },
      );
    }

    if (user.app_metadata.platform_admin !== true) {
      await authAdmin.updateUserById(user.id, { app_metadata: { platform_admin: true } });
    }

    const secure = isSecureRequest(request);
    const response = clearSignedOut(NextResponse.json({ ok: true }), secure);
    await attachProfileSession(response, user.id, secure);
    return response;
  } catch (error) {
    console.error("admin-login", error);
    return NextResponse.json({ error: "Não foi possível entrar." }, { status: 500 });
  }
}
