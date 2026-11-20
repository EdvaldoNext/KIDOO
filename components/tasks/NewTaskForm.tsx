"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { HelpTip } from "@/components/HelpTip";
import Link from "next/link";

type Child = { id: string; display_name: string };
type RepeatMode = "once" | "daily" | "weekdays";

const DAY_OPTIONS = [
  { day: 1, label: "Seg" },
  { day: 2, label: "Ter" },
  { day: 3, label: "Qua" },
  { day: 4, label: "Qui" },
  { day: 5, label: "Sex" },
  { day: 6, label: "Sáb" },
  { day: 0, label: "Dom" },
];

const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function repeatSentence(mode: RepeatMode, days: number[], childName: string, time: string) {
  if (mode === "once") return null;
  if (mode === "weekdays" && days.length === 0) return "Escolha pelo menos um dia.";
  const when =
    mode === "daily"
      ? "todo dia"
      : days
          .slice()
          .sort((a, b) => DAY_OPTIONS.findIndex((option) => option.day === a) - DAY_OPTIONS.findIndex((option) => option.day === b))
          .map((day) => DAY_NAMES[day])
          .join(", ");
  const hour = time ? `, às ${time}` : "";
  return `Vai aparecer ${when} para ${childName}${hour}.`;
}

export function NewTaskForm({ childrenList }: { childrenList: Child[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"points" | "reminder">("points");
  const [repeat, setRepeat] = useState<RepeatMode>("once");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [childId, setChildId] = useState(childrenList[0]?.id ?? "");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    if (repeat === "weekdays" && days.length === 0) {
      setError("Escolha pelo menos um dia.");
      setPending(false);
      return;
    }

    const requirePhoto = kind === "points" ? true : formData.get("require_photo") === "on";
    const payload = {
      title: String(formData.get("title")),
      child_id: childId,
      kind,
      description: String(formData.get("description") ?? "") || null,
      weight: kind === "points" ? Number(formData.get("weight") ?? 1) : 0,
      due_at: repeat === "once" ? String(formData.get("due_at") || "") || null : null,
      require_photo: requirePhoto,
      repeat,
      weekdays: repeat === "daily" ? [0, 1, 2, 3, 4, 5, 6] : days,
      time_local: repeat === "once" ? null : time || null,
    };

    const response = await fetch(CLIENT_DEV_BYPASS_AUTH ? "/api/dev/tasks" : "/api/family/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Não foi possível criar a tarefa.");
      setPending(false);
      return;
    }
    router.push(repeat === "once" ? "/app/tarefas" : "/app/tarefas?aviso=rotina");
    router.refresh();
  }

  const childName = childrenList.find((child) => child.id === childId)?.display_name ?? "a criança";
  const sentence = repeatSentence(repeat, days, childName, time);
  if (childrenList.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-navy/70 ring-1 ring-navy/5">
        <p>Cadastre um filho antes de criar tarefas.</p>
        <Link href="/app/filhos" className="mt-4 inline-block rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Cadastrar filho
        </Link>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-4 rounded-2xl bg-white p-6 ring-1 ring-navy/5">
      <div>
        <div className="mb-2 inline-flex items-center text-sm font-semibold">
          Tipo da tarefa
          <HelpTip label="Ajuda sobre o tipo da tarefa">
            Pontos: vale para a recompensa do mês e pede foto. Lembrete: só avisa, sem pontuar.
          </HelpTip>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-canvas p-1">
          <button type="button" onClick={() => setKind("points")} className={`rounded-lg py-2 text-sm font-bold ${kind === "points" ? "bg-royal text-white" : ""}`}>
            Com pontos
          </button>
          <button type="button" onClick={() => setKind("reminder")} className={`rounded-lg py-2 text-sm font-bold ${kind === "reminder" ? "bg-royal text-white" : ""}`}>
            Lembrete
          </button>
        </div>
      </div>
      <label className="block text-sm font-semibold">
        Título
        <input name="title" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
      </label>
      <label className="block text-sm font-semibold">
        Filho
        <select
          name="child_id"
          required
          value={childId}
          onChange={(event) => setChildId(event.target.value)}
          className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3"
        >
          {childrenList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
      </label>
      {kind === "points" ? (
        <label className="block text-sm font-semibold">
          <span className="inline-flex items-center">
            Quantos pontos vale
            <HelpTip label="Ajuda sobre os pontos">
              Quanto vale esta tarefa. Arrumar a cama = 1. Lavar a louça = 3. Se a família usa mesada, a criança vê isso em R$.
            </HelpTip>
          </span>
          <input name="weight" type="number" min={1} max={20} defaultValue={1} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
        </label>
      ) : (
        <label className="flex gap-2 text-sm font-semibold">
          <input name="require_photo" type="checkbox" />
          Exigir foto mesmo sem pontos
        </label>
      )}
      <fieldset>
        <legend className="inline-flex items-center text-sm font-semibold">
          Repetir
          <HelpTip label="Ajuda sobre repetir a tarefa">
            Só desta vez cria uma tarefa. Todo dia ou alguns dias criam a tarefa sozinhos, uma por dia. Apagar tira aquele dia. Parar repetição tira os próximos.
          </HelpTip>
        </legend>
        <div className="mt-2 space-y-2">
          {(
            [
              ["once", "Só desta vez"],
              ["daily", "Todo dia"],
              ["weekdays", "Alguns dias"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="radio"
                name="repeat"
                value={value}
                checked={repeat === value}
                onChange={() => setRepeat(value)}
                className="h-4 w-4 accent-royal"
              />
              {label}
            </label>
          ))}
        </div>
        {repeat === "weekdays" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {DAY_OPTIONS.map((option) => {
              const selected = days.includes(option.day);
              return (
                <button
                  key={option.day}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setDays((current) =>
                      current.includes(option.day) ? current.filter((day) => day !== option.day) : [...current, option.day],
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-bold ${selected ? "bg-royal text-white" : "bg-canvas text-navy"}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </fieldset>
      {repeat === "once" ? (
        <label className="block text-sm font-semibold">
          Prazo (opcional)
          <input name="due_at" type="datetime-local" className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
        </label>
      ) : (
        <label className="block text-sm font-semibold">
          Horário (opcional)
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3"
          />
        </label>
      )}
      {sentence ? <p className="text-sm font-semibold text-navy/70">{sentence}</p> : null}
      <label className="block text-sm font-semibold">
        Descrição
        <textarea name="description" rows={3} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
      </label>
      {kind === "points" ? (
        <p className="text-sm text-navy/70">Foto obrigatória. Sem foto o filho não conclui.</p>
      ) : null}
      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
      <button disabled={pending} className="rounded-xl bg-royal px-5 py-3 font-bold text-white">
        {pending ? "Salvando..." : "Criar tarefa"}
      </button>
    </form>
  );
}
