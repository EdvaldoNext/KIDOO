import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/backend/admin";
import { createClient } from "@/lib/backend/server";
import { clearSessionCookie } from "@/lib/backend/session";
import { requireParentFamilyId } from "@/lib/parent-family";
import { clearDeviceCookies, isSecureRequest, markSignedOut } from "@/lib/dev-cookies";

const REWARD_MODES = ["points", "symbolic", "allowance"];

/** Only these columns can be changed from the settings screen (plan/status stay admin-only). */
export async function PATCH(request: Request) {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Só pais podem alterar as configurações." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const patch: Record<string, unknown> = {};

  if (typeof body?.name === "string") patch.name = body.name;
  if (typeof body?.reward_mode === "string") {
    if (!REWARD_MODES.includes(body.reward_mode)) {
      return NextResponse.json({ error: "Recompensa inválida." }, { status: 400 });
    }
    patch.reward_mode = body.reward_mode;
  }
  if (body && "points_per_currency" in body) patch.points_per_currency = body.points_per_currency;
  if (body && "currency_amount" in body) patch.currency_amount = body.currency_amount;
  if (body && "reward_note" in body) patch.reward_note = body.reward_note;
  if (typeof body?.location_24h_enabled === "boolean") patch.location_24h_enabled = body.location_24h_enabled;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para salvar." }, { status: 400 });
  }

  const { error } = await createServiceClient().from("families").update(patch).eq("id", familyId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/** LGPD: erases the family, its children accounts, photos and every record (was delete_my_family). */
export async function DELETE(request: Request) {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Só pais podem excluir a família." }, { status: 403 });
  }

  const db = await createClient();
  const { error } = await db.rpc("delete_my_family");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const secure = isSecureRequest(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, secure);
  return markSignedOut(clearDeviceCookies(response, secure), secure);
}
