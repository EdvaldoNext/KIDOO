"use client";

import { useEffect, useRef, useState } from "react";
import { LIVE_GEO_OPTIONS, queryGeoPermission, watchBrowserPosition, type GeoFailure } from "@/lib/geo";
import { shouldPublishLiveFix } from "@/lib/live-location";
import { KidooLocation, isNativeAndroid } from "@/lib/native-location";

export function KidsLiveLocation({
  enabled,
  childId,
}: {
  enabled: boolean;
  childId: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [needsSettings, setNeedsSettings] = useState(false);
  const [watching, setWatching] = useState(false);
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const stopWatch = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopWatch.current?.();
      stopWatch.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !childId) {
      if (isNativeAndroid()) {
        void KidooLocation.stop();
      }
      stopWatch.current?.();
      stopWatch.current = null;
      setWatching(false);
      setMessage(null);
      setNeedsPermission(false);
      return;
    }

    let cancelled = false;

    if (isNativeAndroid()) {
      setMessage("Ativando o rastreador do celular…");
      void (async () => {
        const sessionResponse = await fetch("/api/family/live-location/session", { method: "POST" });
        const session = (await sessionResponse.json()) as { token?: string; error?: string };
        if (cancelled) return;
        if (!sessionResponse.ok || !session.token) {
          setMessage(session.error ?? "Não deu para ligar o rastreador nativo.");
          return;
        }

        try {
          const result = await KidooLocation.start({
            endpoint: `${window.location.origin}/api/family/live-location`,
            token: session.token,
          });
          if (cancelled) return;
          setNeedsSettings(Boolean(result.needsSettings));
          setNeedsPermission(false);
          setMessage(
            result.message ??
              "Os pais podem ver onde você está, mesmo com o KIDOO fechado. Uma notificação fica na barra.",
          );
        } catch (error) {
          if (cancelled) return;
          setNeedsPermission(true);
          setMessage(error instanceof Error ? error.message : "Toque em Permitir localização.");
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    void queryGeoPermission().then((state) => {
      if (cancelled) return;
      if (state === "granted") {
        beginWatch();
        return;
      }
      setWatching(false);
      setNeedsPermission(true);
      setMessage(
        state === "denied"
          ? "O Chrome bloqueou o GPS. Toque no ícone ao lado do endereço → Permissões → Localização → Permitir. Depois toque no botão abaixo."
          : "Toque no botão. O celular vai perguntar se o KIDOO pode usar a localização. Toque em Permitir.",
      );
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, childId]);

  function beginWatch() {
    stopWatch.current?.();
    setNeedsPermission(false);
    setWatching(true);
    setMessage("Pedindo localização ao celular…");

    stopWatch.current = watchBrowserPosition(
      (fix) => {
        setNeedsPermission(false);
        if (!shouldPublishLiveFix(lastSent.current, fix)) {
          setMessage("Localização ligada. Os pais veem o mapa enquanto o KIDOO estiver aberto.");
          return;
        }
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
          if (response.ok) {
            setMessage("Localização ligada. Os pais veem o mapa enquanto o KIDOO estiver aberto.");
            return;
          }
          const payload = (await response.json()) as { error?: string };
          setMessage(payload.error ?? "Não deu para enviar o local agora.");
        });
      },
      (error: GeoFailure) => {
        setWatching(false);
        setNeedsPermission(true);
        setMessage(error.message);
      },
      LIVE_GEO_OPTIONS,
    );
  }

  if (!enabled || !childId || !message) return null;

  return (
    <div className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-navy/75 ring-1 ring-navy/10">
      <p>{message}</p>
      {needsPermission ? (
        <button
          type="button"
          onClick={beginWatch}
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
