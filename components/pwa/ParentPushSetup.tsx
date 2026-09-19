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
  if (!subscription) return false;

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return false;

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
  });
  return true;
}

export function ParentPushSetup({ variant = "banner" }: { variant?: "banner" | "card" }) {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setReady(true);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);
    setHidden(window.localStorage.getItem(DISMISS_KEY) === "1");
    setReady(true);

    void registerParentServiceWorker().then(async () => {
      if (Notification.permission === "granted") {
        const ok = await syncExistingSubscription();
        setSubscribed(ok);
      }
    });
  }, []);

  async function enablePush() {
    setPending(true);
    setError(null);
    try {
      await subscribeParentPush();
      setPermission("granted");
      setSubscribed(true);
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

  if (!ready) {
    return variant === "card" ? (
      <p className="text-sm font-semibold text-navy/60">Verificando notificações neste celular…</p>
    ) : null;
  }

  if (!supported) {
    if (variant === "card") {
      return (
        <p className="text-sm font-semibold text-alert">
          Este navegador não recebe alerta com o app fechado. Abra o KIDOO no Chrome e instale na tela inicial.
        </p>
      );
    }
    return null;
  }

  if (variant === "banner" && (permission === "granted" || hidden)) return null;

  if (variant === "card" && permission === "granted" && subscribed) {
    return (
      <p className="rounded-xl bg-success/15 px-3 py-3 text-sm font-bold text-navy">
        Este celular vai tocar quando um filho enviar tarefa para aprovar.
      </p>
    );
  }

  return (
    <div
      className={
        variant === "card"
          ? "rounded-xl bg-royal/10 p-4"
          : "mb-6 rounded-2xl bg-royal/10 p-5 ring-1 ring-royal/20"
      }
    >
      <p className="font-extrabold text-navy">Receba alerta neste celular</p>
      <p className="mt-2 text-sm font-semibold text-navy/80">
        Pai e mãe precisam ativar cada um no próprio aparelho. Quando o filho enviar a tarefa, os dois celulares
        tocam — mesmo com o app fechado. No Xiaomi, deixe o Chrome sem restrição de bateria.
      </p>
      <button
        type="button"
        onClick={() => void enablePush()}
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-royal px-4 py-3 font-extrabold text-white disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Ativando…" : "Ativar notificações"}
      </button>
      {error ? <p className="mt-3 text-sm font-bold text-alert">{error}</p> : null}
      {variant === "banner" ? (
        <button type="button" onClick={dismiss} className="mt-3 block text-sm font-bold text-royal">
          Agora não
        </button>
      ) : null}
    </div>
  );
}
