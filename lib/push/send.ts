import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  PUSH_APPROVALS_URL,
  PUSH_BADGE,
  PUSH_ICON,
} from "@/lib/push/config";
import type { PushPayload, PushSubscriptionRow, StoredPushSubscription } from "@/lib/push/types";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;

  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function toWebPushSubscription(row: PushSubscriptionRow): StoredPushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

export async function sendPushToSubscription(
  subscription: StoredPushSubscription,
  payload: PushPayload,
) {
  if (!ensureVapid()) {
    throw new Error("VAPID keys não configuradas.");
  }

  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

export async function notifyParentsTaskAwaitingApproval(
  admin: SupabaseClient,
  familyId: string,
  taskId: string,
) {
  if (!ensureVapid()) {
    return { sent: 0, skipped: "vapid_not_configured" as const };
  }

  const { data: task, error: taskError } = await admin
    .from("tasks")
    .select("id, title, family_id, assigned_child_id, status")
    .eq("id", taskId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (taskError || !task) {
    return { sent: 0, skipped: "task_not_found" as const };
  }

  if (task.status !== "awaiting_approval") {
    return { sent: 0, skipped: "not_awaiting_approval" as const };
  }

  const [{ data: child }, { data: parents }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", task.assigned_child_id).maybeSingle(),
    admin
      .from("profiles")
      .select("id")
      .eq("family_id", familyId)
      .in("role", ["owner", "parent"]),
  ]);

  const parentIds = (parents ?? []).map((row) => row.id);
  if (parentIds.length === 0) {
    return { sent: 0, skipped: "no_parents" as const };
  }

  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", parentIds);

  if (subsError || !subscriptions?.length) {
    return { sent: 0, skipped: "no_subscriptions" as const };
  }

  const childName = child?.display_name?.trim() || "Seu filho";
  const payload: PushPayload = {
    title: "Nova tarefa para aprovar",
    body: `${childName} concluiu: ${task.title}`,
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
    tag: `task-${task.id}`,
    data: { url: PUSH_APPROVALS_URL },
  };

  let sent = 0;
  const staleIds: string[] = [];

  for (const row of subscriptions as PushSubscriptionRow[]) {
    try {
      await sendPushToSubscription(toWebPushSubscription(row), payload);
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? error.statusCode : null;
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(row.id);
      }
    }
  }

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return { sent, staleRemoved: staleIds.length };
}
