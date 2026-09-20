import { NextResponse } from "next/server";
import { getAppContext, resolveChildDevice } from "@/lib/app-context";
import { createServiceClient } from "@/utils/supabase/admin";
import { STORAGE_BUCKET, STORAGE_PROVIDER } from "@/lib/photo-key";

export const maxDuration = 30;

function uploadedPhoto(value: FormDataEntryValue | null): Blob | null {
  return value instanceof Blob && value.size > 0 ? value : null;
}

export async function POST(request: Request) {
  try {
    return await completeTask(request);
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar. Tente de novo." }, { status: 500 });
  }
}

async function completeTask(request: Request) {
  const formData = await request.formData();
  const taskId = String(formData.get("task_id") ?? "");
  const completionId = String(formData.get("completion_id") ?? "");
  const familyId = String(formData.get("family_id") ?? "");
  const childId = String(formData.get("child_id") ?? "");
  const kind = String(formData.get("kind") ?? "points") as "points" | "reminder";
  const photo = uploadedPhoto(formData.get("photo"));
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const locationAvailable = formData.get("location_available") === "true";
  const childNoteRaw = String(formData.get("child_note") ?? "").trim();
  const childNote = childNoteRaw.length > 0 && childNoteRaw.length <= 280 ? childNoteRaw : null;

  if (!taskId || !completionId || !familyId || !childId) {
    return NextResponse.json({ error: "Dados da tarefa incompletos." }, { status: 400 });
  }

  const deviceChild = await resolveChildDevice();
  const childFromDevice = deviceChild?.id === childId && deviceChild.family_id === familyId;
  if (!childFromDevice) {
    const context = await getAppContext();
    if (!context.childId || context.childId !== childId || context.familyId !== familyId) {
      return NextResponse.json(
        { error: "Entre com a chave da casa e toque no seu nome para enviar esta missão." },
        { status: 403 },
      );
    }
  }

  const admin = createServiceClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id, family_id, assigned_child_id, kind, status")
    .eq("id", taskId)
    .maybeSingle();

  if (!task || task.family_id !== familyId || task.assigned_child_id !== childId) {
    return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }
  if (task.status !== "pending") {
    return NextResponse.json({ error: "Esta missão já foi enviada." }, { status: 409 });
  }

  let photoKey: string | null = null;
  if (photo) {
    photoKey = String(formData.get("photo_key") ?? "");
    if (!photoKey.startsWith(`families/${familyId}/children/${childId}/`)) {
      return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
    }
    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(photoKey, photo, { contentType: photo.type || "image/jpeg", upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: "Não deu para guardar a foto. Tente de novo." }, { status: 400 });
    }
  }

  const { error: insertError } = await admin.from("task_completions").insert({
    id: completionId,
    family_id: familyId,
    task_id: taskId,
    child_id: childId,
    photo_key: photoKey,
    storage_provider: STORAGE_PROVIDER,
    lat: latRaw ? Number(latRaw) : null,
    lng: lngRaw ? Number(lngRaw) : null,
    location_available: locationAvailable,
    child_note: childNote,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const { error: taskError } = await admin
    .from("tasks")
    .update({ status: (kind || task.kind) === "points" ? "awaiting_approval" : "completed" })
    .eq("id", taskId);
  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
