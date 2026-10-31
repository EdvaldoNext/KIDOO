import { NextResponse } from "next/server";
import { createClient } from "@/lib/backend/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    plan_limits?: unknown;
    feature_flags?: unknown;
  } | null;

  if (!body || typeof body.plan_limits !== "object" || typeof body.feature_flags !== "object") {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const db = await createClient();
  const { error } = await db.rpc("update_platform_settings", {
    p_plan_limits: body.plan_limits,
    p_feature_flags: body.feature_flags,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === "forbidden" ? 403 : 400 });
  }
  return NextResponse.json({ ok: true });
}
