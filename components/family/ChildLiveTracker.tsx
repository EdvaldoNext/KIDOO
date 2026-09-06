"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LocationMap } from "@/components/location/LocationMap";
import {
  liveSignalLabel,
  liveSignalStatus,
  type LiveLocationRow,
  type LiveSignalStatus,
} from "@/lib/live-location";

function statusTone(status: LiveSignalStatus) {
  if (status === "live") return "bg-success/15 text-navy";
  if (status === "recent") return "bg-pending/40 text-navy";
  return "bg-navy/5 text-navy/60";
}

export function ChildLiveTracker({
  childId,
  childName,
  locationOn,
  initial,
}: {
  childId: string;
  childName: string;
  locationOn: boolean;
  initial: LiveLocationRow | null;
}) {
  const [live, setLive] = useState<LiveLocationRow | null>(initial);
  const [now, setNow] = useState(Date.now());
  const status = liveSignalStatus(live?.captured_at, now);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const response = await fetch(`/api/family/live-location?childId=${encodeURIComponent(childId)}`);
      const payload = (await response.json()) as { locations?: LiveLocationRow[] };
      if (cancelled) return;
      setLive(payload.locations?.[0] ?? null);
      setNow(Date.now());
    }

    void refresh();
    const poll = window.setInterval(() => void refresh(), 8000);
    const tick = window.setInterval(() => setNow(Date.now()), 5000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [childId]);

  if (!locationOn) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-navy/5">
        <p className="font-extrabold">Rastreador desligado</p>
        <p className="mt-2 text-sm text-navy/70">
          Ligue em Configurações para ver {childName} enquanto o app dos filhos estiver aberto. O local da
          foto continua separado, na aprovação e no histórico.
        </p>
        <Link href="/app/configuracoes" className="mt-4 inline-block font-bold text-royal hover:underline">
          Abrir configurações
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-navy/5">
      {live ? (
        <LocationMap
          key={`${live.lat.toFixed(4)},${live.lng.toFixed(4)}`}
          lat={live.lat}
          lng={live.lng}
          label={`Posição ao vivo de ${childName}`}
          className="h-72 sm:h-96"
        />
      ) : (
        <div className="grid h-72 place-items-center bg-canvas px-6 text-center sm:h-96">
          <p className="font-bold text-navy/60">
            Sem sinal ainda. Peça para {childName} deixar o KIDOO aberto no celular.
          </p>
        </div>
      )}
      <div className="space-y-3 p-4">
        <p className={`inline-flex rounded-full px-3 py-1 text-sm font-extrabold ${statusTone(status)}`}>
          {liveSignalLabel(status)}
        </p>
        {live ? (
          <>
            <p className="text-sm text-navy/70">
              Último sinal em {new Date(live.captured_at).toLocaleString("pt-BR")}
              {live.accuracy_m != null ? ` · precisão de ${Math.round(live.accuracy_m)} m` : ""}.
            </p>
            <p className="text-sm text-navy/55">
              Isso não é o local da última foto. É o último sinal do app de {childName}.
            </p>
            <a
              href={`https://www.google.com/maps?q=${live.lat},${live.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-bold text-royal hover:underline"
            >
              Abrir no Google Maps
            </a>
          </>
        ) : (
          <p className="text-sm text-navy/70">O mapa aparece quando o app dos filhos enviar o primeiro sinal.</p>
        )}
      </div>
    </div>
  );
}
