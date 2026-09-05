"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LocationMap } from "@/components/location/LocationMap";
import { MonthSelect } from "@/components/family/MonthSelect";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { currentMonthKey, monthKey, selectableMonthKeys } from "@/lib/dates";

export type HistoryItem = {
  id: string;
  capturedAt: string;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
  locationAvailable: boolean;
  taskTitle: string;
  childName: string;
  childNote: string | null;
};

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" />
      <path strokeLinecap="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [month, setMonth] = useState(currentMonthKey);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => selectableMonthKeys(list.map((item) => item.capturedAt)), [list]);

  const visible = useMemo(
    () => (month === "all" ? list : list.filter((item) => monthKey(item.capturedAt) === month)),
    [list, month],
  );

  const allSelected = visible.length > 0 && visible.every((item) => selected.includes(item.id));

  function toggleOne(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    const visibleIds = visible.map((item) => item.id);
    setSelected((current) =>
      allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])],
    );
  }

  async function removeIds(ids: string[], confirmMessage: string) {
    if (ids.length === 0) return;
    if (!confirm(confirmMessage)) return;

    setPending(true);
    setError(null);
    const response = await fetch("/api/family/completions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível excluir.");
      setPending(false);
      return;
    }

    setList((current) => current.filter((item) => !ids.includes(item.id)));
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    setPending(false);
    router.refresh();
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-navy/5">
        <p className="font-bold">Nenhum registro ainda.</p>
        <p className="mt-2 text-sm text-navy/65">Quando um filho concluir uma tarefa, a foto e o local aparecem aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-navy/5 sm:flex-row sm:items-center sm:justify-between">
        <MonthSelect
          value={month}
          months={months}
          onChange={(next) => {
            setMonth(next);
            setSelected([]);
          }}
        />
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <p className="text-sm font-bold text-navy/70">
            {visible.length} {visible.length === 1 ? "registro" : "registros"} neste recorte
          </p>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={visible.length === 0}
              className="h-4 w-4 accent-royal"
              aria-label="Selecionar todos"
            />
            Todos
          </label>
          <button
            type="button"
            disabled={pending || selected.length === 0}
            onClick={() =>
              void removeIds(
                selected,
                selected.length === visible.length && month !== "all"
                  ? "Excluir todos os registros deste mês? As fotos também serão apagadas."
                  : selected.length === list.length
                    ? "Excluir todos os registros do histórico? As fotos também serão apagadas."
                    : `Excluir ${selected.length} registro(s) do histórico? As fotos também serão apagadas.`,
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-alert/10 px-3 py-2 text-sm font-bold text-alert disabled:opacity-40"
            aria-label="Excluir selecionados"
          >
            <TrashIcon />
            {selected.length > 0 ? `Excluir (${selected.length})` : "Excluir"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-navy/70 ring-1 ring-navy/5">
          Nenhum registro neste mês. Escolha outro mês ou “Todos os meses”.
        </p>
      ) : null}

      <div className="grid gap-4">
        {visible.map((item) => {
          const checked = selected.includes(item.id);
          const hasLocation = item.locationAvailable && item.lat != null && item.lng != null;
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-navy/5">
              <div className="flex items-start gap-3 p-3 sm:p-4">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(item.id)}
                  className="mt-2 h-4 w-4 shrink-0 accent-royal"
                  aria-label={`Selecionar ${item.taskTitle}`}
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span aria-hidden className="mt-0.5">
                        <KidAvatar name={item.childName} size="sm" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-navy/60">{item.childName}</p>
                        <p className="font-extrabold">{item.taskTitle}</p>
                        <p className="text-sm text-navy/70">
                          {new Date(item.capturedAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        void removeIds([item.id], "Excluir este registro do histórico? A foto também será apagada.")
                      }
                      className="inline-flex shrink-0 rounded-xl bg-alert/10 p-2 text-alert disabled:opacity-40"
                      aria-label="Excluir este registro"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photoUrl}
                        alt={`Foto de ${item.taskTitle}`}
                        className="h-48 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="grid h-48 place-items-center rounded-xl bg-canvas text-sm text-navy/50">
                        Sem foto
                      </div>
                    )}
                    {hasLocation ? (
                      <div className="space-y-2">
                        <LocationMap lat={item.lat!} lng={item.lng!} label="Local da tarefa" className="h-48" />
                        <a
                          href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm font-bold text-royal underline"
                        >
                          Abrir no Google Maps
                        </a>
                      </div>
                    ) : (
                      <div className="grid h-48 place-items-center rounded-xl bg-canvas text-sm text-navy/50">
                        Local não disponível
                      </div>
                    )}
                  </div>

                  {item.childNote ? (
                    <p className="rounded-xl bg-canvas px-3 py-2 text-sm font-semibold text-navy">
                      “{item.childNote}”
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
