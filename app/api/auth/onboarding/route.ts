import { NextResponse } from "next/server";
import { attachProfileSession } from "@/lib/auth-session";
import { createClient } from "@/lib/backend/server";
import { clearSignedOut, isSecureRequest, withDevFamilySession } from "@/lib/dev-cookies";

/** Second step of sign-up for an account that has no family yet (was the register_parent RPC). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    family_name?: unknown;
    display_name?: unknown;
    lgpd_accepted?: unknown;
  } | null;

  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: familyId, error } = await db.rpc("register_parent", {
    p_family_name: typeof body?.family_name === "string" ? body.family_name : "",
    p_display_name: typeof body?.display_name === "string" ? body.display_name : "",
    p_lgpd_accepted: body?.lgpd_accepted === true,
  });
  if (error || typeof familyId !== "string") {
    return NextResponse.json({ error: error?.message ?? "Não foi possível criar a família." }, { status: 400 });
  }

  const secure = isSecureRequest(request);
  const response = clearSignedOut(
    withDevFamilySession(NextResponse.json({ ok: true, family_id: familyId }), familyId, secure),
    secure,
  );
  await attachProfileSession(response, userId, secure);
  return response;
}
