import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { getPushWebhookSecret } from "@/lib/push/config";
import { notifyParentsTaskAwaitingApproval } from "@/lib/push/send";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = getPushWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const body = (await request.json().catch(() => null)) as {
    family_id?: unknown;
    task_id?: unknown;
  } | null;

  const familyId = typeof body?.family_id === "string" ? body.family_id : "";
  const taskId = typeof body?.task_id === "string" ? body.task_id : "";

  if (!UUID_RE.test(familyId) || !UUID_RE.test(taskId)) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const result = await notifyParentsTaskAwaitingApproval(admin, familyId, taskId);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Falha ao enviar push." }, { status: 500 });
  }
}
