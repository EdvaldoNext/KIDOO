"use client";

import { useEffect, useRef, useState } from "react";
import { LIVE_GEO_OPTIONS, watchBrowserPosition, type GeoFailure } from "@/lib/geo";
import { shouldPublishLiveFix } from "@/lib/live-location";

export function KidsLiveLocation({
  enabled,
  childId,
}: {
  enabled: boolean;
  childId: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const [watchNonce, setWatchNonce] = useState(0);

  useEffect(() => {
    if (!enabled || !childId) return;

    let cancelled = false;
    setMessage("Os pais podem ver onde você está enquanto o app estiver aberto.");

    const stop = watchBrowserPosition(
      (fix) => {
        if (cancelled) return;
        setNeedsPermission(false);
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
            setMessage("Os pais podem ver onde você está enquanto o app estiver aberto.");
            return;
          }
          const payload = (await response.json()) as { error?: string };
          setMessage(payload.error ?? "Não deu para enviar o local agora.");
        });
      },
      (error: GeoFailure) => {
        if (cancelled) return;
        setNeedsPermission(error.code === "denied" || error.code === "insecure");
        setMessage(error.message);
      },
      LIVE_GEO_OPTIONS,
    );

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, childId, watchNonce]);

  if (!enabled || !childId || !message) return null;

  return (
    <div className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-navy/75 ring-1 ring-navy/10">
      <p>{message}</p>
      {needsPermission ? (
        <button
          type="button"
          onClick={() => setWatchNonce((value) => value + 1)}
          className="mt-2 font-extrabold text-royal"
        >
          Permitir localização
        </button>
      ) : null}
    </div>
  );
}
