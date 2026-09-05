import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { requireParentFamilyId } from "@/lib/parent-family";
import { STORAGE_BUCKET } from "@/lib/photo-key";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uniqueIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && UUID_RE.test(id)))];
}

export async function DELETE(request: Request) {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Só pais podem excluir o histórico." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = uniqueIds(body?.ids);

  if (ids.length === 0) {
    return NextResponse.json({ error: "Selecione pelo menos um registro." }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "Exclua no máximo 200 registros por vez." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data: rows, error: loadError } = await admin
      .from("task_completions")
      .select("id, photo_key, task_id")
      .eq("family_id", familyId)
      .in("id", ids);

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 400 });
    }
    if (!rows?.length) {
      return NextResponse.json({ error: "Registros não encontrados." }, { status: 404 });
    }

    const photoKeys = rows.map((row) => row.photo_key).filter((key): key is string => Boolean(key));
    if (photoKeys.length > 0) {
      await admin.storage.from(STORAGE_BUCKET).remove(photoKeys);
    }

    const { error: deleteError } = await admin
      .from("task_completions")
      .delete()
      .eq("family_id", familyId)
      .in(
        "id",
        rows.map((row) => row.id),
      );

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    const taskIds = [...new Set(rows.map((row) => row.task_id))];
    const { data: tasks } = await admin
      .from("tasks")
      .select("id, status")
      .eq("family_id", familyId)
      .in("id", taskIds);

    const awaitingIds = (tasks ?? [])
      .filter((task) => task.status === "awaiting_approval")
      .map((task) => task.id);

    if (awaitingIds.length > 0) {
      const { data: remaining } = await admin
        .from("task_completions")
        .select("task_id")
        .eq("family_id", familyId)
        .in("task_id", awaitingIds)
        .is("approved_at", null)
        .is("rejected_at", null);

      const stillWaiting = new Set((remaining ?? []).map((row) => row.task_id));
      const toReset = awaitingIds.filter((id) => !stillWaiting.has(id));
      if (toReset.length > 0) {
        await admin.from("tasks").update({ status: "pending" }).in("id", toReset);
      }
    }

    return NextResponse.json({ ok: true, deleted: rows.length });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o histórico." }, { status: 500 });
  }
}
