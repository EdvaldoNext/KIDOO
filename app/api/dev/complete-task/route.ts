import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { STORAGE_BUCKET, STORAGE_PROVIDER } from "@/lib/photo-key";

export async function POST(request: Request) {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  const formData = await request.formData();
  const taskId = String(formData.get("task_id") ?? "");
  const completionId = String(formData.get("completion_id") ?? "");
  const familyId = String(formData.get("family_id") ?? "");
  const childId = String(formData.get("child_id") ?? "");
  const kind = String(formData.get("kind") ?? "points") as "points" | "reminder";
  const photo = formData.get("photo");
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const locationAvailable = formData.get("location_available") === "true";
  const childNoteRaw = String(formData.get("child_note") ?? "").trim();
  const childNote = childNoteRaw.length > 0 && childNoteRaw.length <= 280 ? childNoteRaw : null;

  if (!taskId || !completionId || !familyId || !childId) {
    return NextResponse.json({ error: "Dados da tarefa incompletos." }, { status: 400 });
  }

  const admin = createServiceClient();
  let photoKey: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    photoKey = String(formData.get("photo_key") ?? "");
    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(photoKey, photo, { contentType: photo.type || "image/jpeg", upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
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
    .update({ status: kind === "points" ? "awaiting_approval" : "completed" })
    .eq("id", taskId);

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
