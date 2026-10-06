"use client";

import { useEffect, useRef, useState } from "react";
import { LIVE_GEO_OPTIONS, queryGeoPermission, watchBrowserPosition, type GeoFailure } from "@/lib/geo";
import { sendThisPhoneLocation, type PhoneLocationResult } from "@/lib/kids-phone-location";
import { shouldPublishLiveFix } from "@/lib/live-location";
import { KidooLocation, isNativeAndroid } from "@/lib/native-location";

const WAIT_MS = 20_000;
const SEEKING = "Pedindo localização ao celular…";
const SENT = "Local enviado. Os pais já podem ver onde você está.";

export function KidsLiveLocation({
  enabled,
  childId,
}: {
  enabled: boolean;
  childId: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [needsSettings, setNeedsSettings] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const stopWatch = useRef<(() => void) | null>(null);
  const settled = useRef(false);
  const waitTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !childId) {
      if (isNativeAndroid()) {
        void KidooLocation.stop();
      }
      stopWatch.current?.();
      stopWatch.current = null;
      settled.current = true;
      if (waitTimer.current) window.clearTimeout(waitTimer.current);
      setMessage(null);
      setSettingsNote(null);
      setNeedsPermission(false);
      setNeedsSettings(false);
      return;
    }

    let cancelled = false;
    settled.current = false;
    lastSent.current = null;
    setSettingsNote(null);
    setNeedsSettings(false);
    setNeedsPermission(false);
    setMessage(SEEKING);

    function clearWait() {
      if (waitTimer.current) {
        window.clearTimeout(waitTimer.current);
        waitTimer.current = null;
      }
    }

    function settle(next: string, permission = false) {
      if (cancelled) return;
      settled.current = true;
      clearWait();
      setNeedsPermission(permission);
      setMessage(next);
    }

    waitTimer.current = window.setTimeout(() => {
      if (cancelled || settled.current) return;
      setNeedsPermission(true);
      setMessage("Ainda sem sinal de GPS. Toque em Permitir localização.");
    }, WAIT_MS);

    function applyPublish(result: PhoneLocationResult) {
      if (cancelled) return false;
      if (result.ok) {
        lastSent.current = { lat: result.fix.lat, lng: result.fix.lng, at: Date.now() };
        settle(isNativeAndroid() ? `${SENT} Com o app fechado, a notificação do KIDOO precisa continuar.` : SENT);
        return true;
      }
      if (result.code === "rejected" && result.trackingOff) {
        stopWatch.current?.();
        stopWatch.current = null;
        if (isNativeAndroid()) void KidooLocation.stop();
        settle("Os pais desligaram o rastreador ao vivo.");
        return false;
      }
      settle(result.message, true);
      return false;
    }

    function beginWatch() {
      stopWatch.current?.();
      stopWatch.current = watchBrowserPosition(
        (fix) => {
          if (cancelled) return;
          if (!shouldPublishLiveFix(lastSent.current, fix)) return;
          lastSent.current = { lat: fix.lat, lng: fix.lng, at: Date.now() };
          void fetch("/api/family/live-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: fix.lat,
              lng: fix.lng,
              accuracy_m: fix.accuracyM,
              heading: fix.heading,
              speed_mps: fix.speedMps,
            }),
          }).then(async (response) => {
            if (cancelled) return;
            if (response.ok) {
              settle(SENT);
              return;
            }
            const payload = (await response.json()) as { error?: string; tracking?: boolean };
            if (response.status === 409 || payload.tracking === false) {
              stopWatch.current?.();
              stopWatch.current = null;
              settle("Os pais desligaram o rastreador ao vivo.");
              return;
            }
            settle(payload.error ?? "Não deu para enviar o local agora.", true);
          });
        },
        (error: GeoFailure) => {
          if (cancelled || settled.current) return;
          settle(error.message, true);
        },
        LIVE_GEO_OPTIONS,
      );
    }

    async function startNative() {
      const sessionResponse = await fetch("/api/family/live-location/session", { method: "POST" });
      const session = (await sessionResponse.json()) as { token?: string; error?: string };
      if (cancelled) return "cancelled" as const;
      if (!sessionResponse.ok || !session.token) {
        settle(
          sessionResponse.status === 409
            ? "Os pais desligaram o rastreador ao vivo."
            : (session.error ?? "Não deu para ligar o rastreador nativo."),
        );
        return "off" as const;
      }

      try {
        const result = await KidooLocation.start({
          endpoint: `${window.location.origin}/api/family/live-location`,
          token: session.token,
        });
        if (cancelled) return "cancelled" as const;
        setNeedsSettings(Boolean(result.needsSettings));
        setSettingsNote(result.needsSettings ? (result.message ?? null) : null);
        return "started" as const;
      } catch (error) {
        if (cancelled) return "cancelled" as const;
        settle(error instanceof Error ? error.message : "Toque em Permitir localização.", true);
        return "error" as const;
      }
    }

    void (async () => {
      if (isNativeAndroid()) {
        const native = await startNative();
        if (cancelled || native === "off" || native === "cancelled" || native === "error") return;
      } else {
        const state = await queryGeoPermission();
        if (cancelled) return;
        if (state === "denied") {
          settle(
            "O Chrome bloqueou o GPS. Toque no ícone ao lado do endereço → Permissões → Localização → Permitir. Depois toque no botão abaixo.",
            true,
          );
          return;
        }
      }

      const result = await sendThisPhoneLocation();
      if (cancelled) return;
      const sent = applyPublish(result);
      if (isNativeAndroid()) return;
      const blocked =
        !sent &&
        !result.ok &&
        (result.code === "denied" ||
          result.code === "insecure" ||
          result.code === "unsupported" ||
          (result.code === "rejected" && result.trackingOff));
      if (!blocked) beginWatch();
    })();

    function onVisible() {
      if (cancelled || document.visibilityState !== "visible") return;
      void sendThisPhoneLocation().then(applyPublish);
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearWait();
      stopWatch.current?.();
      stopWatch.current = null;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, childId, attempt]);

  if (!enabled || !childId || !message) return null;

  return (
    <div className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-navy/75 ring-1 ring-navy/10">
      <p>{message}</p>
      {settingsNote ? <p className="mt-2 text-navy/60">{settingsNote}</p> : null}
      {needsPermission ? (
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="mt-3 w-full rounded-2xl bg-royal py-3 font-extrabold text-white"
        >
          Permitir localização
        </button>
      ) : null}
      {needsSettings ? (
        <button
          type="button"
          onClick={() => void KidooLocation.openSettings()}
          className="mt-2 font-extrabold text-royal"
        >
          Abrir ajustes do Android
        </button>
      ) : null}
    </div>
  );
}
