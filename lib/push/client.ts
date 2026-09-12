"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerParentServiceWorker() {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeParentPush() {
  if (!isPushSupported()) {
    throw new Error("Este navegador não suporta notificações push.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificação negada.");
  }

  const keyResponse = await fetch("/api/push/vapid-public-key");
  if (!keyResponse.ok) {
    throw new Error("Push ainda não está configurado no servidor.");
  }

  const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
  if (!publicKey) {
    throw new Error("Chave pública VAPID ausente.");
  }

  await registerParentServiceWorker();
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Assinatura push inválida.");
  }

  const saveResponse = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
  });

  if (!saveResponse.ok) {
    const payload = (await saveResponse.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Não foi possível salvar a assinatura.");
  }

  return subscription;
}

export async function unsubscribeParentPush() {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}
