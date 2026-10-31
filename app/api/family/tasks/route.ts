import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/backend/admin";
import { requireParentActor, requireParentFamilyId } from "@/lib/parent-family";
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
    return NextResponse.json({ error: "Só pais podem excluir tarefas." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = uniqueIds(body?.ids);

  if (ids.length === 0) {
    return NextResponse.json({ error: "Selecione pelo menos uma tarefa." }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "Exclua no máximo 200 tarefas por vez." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data: tasks, error: loadError } = await admin
      .from("tasks")
      .select("id")
      .eq("family_id", familyId)
      .in("id", ids);

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 400 });
    }
    if (!tasks?.length) {
      return NextResponse.json({ error: "Tarefas não encontradas." }, { status: 404 });
    }

    const taskIds = tasks.map((task) => task.id);
    const { data: completions } = await admin
      .from("task_completions")
      .select("photo_key")
      .eq("family_id", familyId)
      .in("task_id", taskIds);

    const photoKeys = (completions ?? [])
      .map((row) => row.photo_key)
      .filter((key): key is string => Boolean(key));
    if (photoKeys.length > 0) {
      await admin.storage.from(STORAGE_BUCKET).remove(photoKeys);
    }

    const { error: deleteError } = await admin.from("tasks").delete().eq("family_id", familyId).in("id", taskIds);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deleted: taskIds.length });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir as tarefas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await requireParentActor();
  if (!actor?.parentId) {
    return NextResponse.json({ error: "Só pais podem criar tarefas." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    child_id?: unknown;
    kind?: unknown;
    weight?: unknown;
    description?: unknown;
    due_at?: unknown;
    require_photo?: unknown;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const childId = typeof body?.child_id === "string" ? body.child_id : "";
  const kind = body?.kind === "reminder" ? "reminder" : "points";

  if (!title || !UUID_RE.test(childId)) {
    return NextResponse.json({ error: "Título e filho são obrigatórios." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data: child } = await admin
      .from("profiles")
      .select("id")
      .eq("id", childId)
      .eq("family_id", actor.familyId)
      .eq("role", "child")
      .maybeSingle();
    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado nesta família." }, { status: 404 });
    }

    const { error } = await admin.from("tasks").insert({
      family_id: actor.familyId,
      created_by: actor.parentId,
      assigned_child_id: childId,
      kind,
      title,
      description: typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null,
      weight: kind === "points" ? Number(body?.weight ?? 1) : 0,
      due_at: typeof body?.due_at === "string" && body.due_at ? body.due_at : null,
      require_photo: kind === "points" ? true : Boolean(body?.require_photo),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a tarefa." }, { status: 500 });
  }
}