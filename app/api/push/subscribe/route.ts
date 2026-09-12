import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { requireParentActor } from "@/lib/parent-family";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function parseSubscription(body: SubscriptionBody | null) {
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth.trim() : "";

  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

export async function POST(request: Request) {
  const actor = await requireParentActor();
  if (!actor?.parentId) {
    return NextResponse.json({ error: "Só pais podem ativar notificações." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  const subscription = parseSubscription(body);
  if (!subscription) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: actor.parentId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        user_agent: request.headers.get("user-agent"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a assinatura." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const actor = await requireParentActor();
  if (!actor?.parentId) {
    return NextResponse.json({ error: "Só pais podem desativar notificações." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";

  try {
    const admin = createServiceClient();
    let query = admin.from("push_subscriptions").delete().eq("user_id", actor.parentId);
    if (endpoint) query = query.eq("endpoint", endpoint);

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover a assinatura." }, { status: 500 });
  }
}
