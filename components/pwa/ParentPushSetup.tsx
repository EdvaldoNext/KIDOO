"use client";

import { useEffect, useState } from "react";
import {
  getExistingPushSubscription,
  isPushSupported,
  registerParentServiceWorker,
  subscribeParentPush,
} from "@/lib/push/client";

const DISMISS_KEY = "kidoo-push-dismissed-parents";

async function syncExistingSubscription() {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return;

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
  });
}

export function ParentPushSetup() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;

    setSupported(true);
    setPermission(Notification.permission);
    setHidden(window.localStorage.getItem(DISMISS_KEY) === "1");

    void registerParentServiceWorker().then(() => {
      if (Notification.permission === "granted") {
        void syncExistingSubscription();
      }
    });
  }, []);

  if (!supported || permission === "granted" || hidden) return null;

  async function enablePush() {
    setPending(true);
    setError(null);
    try {
      await subscribeParentPush();
      setPermission("granted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ativar as notificações.");
    } finally {
      setPending(false);
    }
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  return (
    <div className="mb-6 rounded-2xl bg-royal/10 p-5 ring-1 ring-royal/20">
      <p className="font-extrabold text-navy">Receba alerta no celular</p>
      <p className="mt-2 text-sm font-semibold text-navy/80">
        Quando seu filho enviar uma tarefa para aprovação, o celular toca e mostra a notificação — mesmo com o app
        fechado.
      </p>
      <button
        type="button"
        onClick={() => void enablePush()}
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-royal px-4 py-3 font-extrabold text-white disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Ativando…" : "Ativar notificações"}
      </button>
      {error ? <p className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
      <button type="button" onClick={dismiss} className="mt-3 block text-sm font-bold text-royal">
        Agora não
      </button>
    </div>
  );
}
