import { NextResponse } from "next/server";
import { decideTaskCompletion } from "@/lib/approve-completion";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { createServiceClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    completion_id?: unknown;
    approve?: unknown;
    note?: unknown;
  } | null;

  if (typeof body?.completion_id !== "string" || typeof body.approve !== "boolean") {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data: completion, error: completionError } = await admin
    .from("task_completions")
    .select("id, family_id")
    .eq("id", body.completion_id)
    .maybeSingle();

  if (completionError || !completion) {
    return NextResponse.json({ error: "Conclusão não encontrada." }, { status: 404 });
  }

  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("family_id", completion.family_id)
    .in("role", ["owner", "parent"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const result = await decideTaskCompletion(admin, {
    completionId: completion.id,
    familyId: completion.family_id,
    parentId: owner?.id ?? null,
    approve: body.approve,
    note: typeof body.note === "string" ? body.note : null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
