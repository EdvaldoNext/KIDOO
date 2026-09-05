"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonthSelect } from "@/components/family/MonthSelect";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { currentMonthKey, monthKey, selectableMonthKeys } from "@/lib/dates";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/status";

export type TaskListItem = {
  id: string;
  title: string;
  status: string;
  weight: number;
  kind: string;
  childName: string;
  createdAt: string;
};

type StatusFilter = "all" | "awaiting_approval" | "pending" | "completed";

const STATUS_ORDER: Record<string, number> = {
  awaiting_approval: 0,
  pending: 1,
  expired: 2,
  completed: 3,
};

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" />
      <path strokeLinecap="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

function nextStep(status: string) {
  if (status === "awaiting_approval") return { href: "/app/aprovacoes", label: "Aprovar" };
  if (status === "completed") return { href: "/app/historico", label: "Histórico" };
  return null;
}

export function TaskList({ items }: { items: TaskListItem[] }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [month, setMonth] = useState(currentMonthKey);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => selectableMonthKeys(list.map((item) => item.createdAt)), [list]);

  const inMonth = useMemo(
    () => (month === "all" ? list : list.filter((item) => monthKey(item.createdAt) === month)),
    [list, month],
  );

  const counts = useMemo(
    () => ({
      awaiting: inMonth.filter((item) => item.status === "awaiting_approval").length,
      open: inMonth.filter((item) => item.status === "pending").length,
      done: inMonth.filter((item) => item.status === "completed").length,
    }),
    [inMonth],
  );

  const visible = useMemo(() => {
    const filtered = statusFilter === "all" ? inMonth : inMonth.filter((item) => item.status === statusFilter);
    return [...filtered].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  }, [inMonth, statusFilter]);

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
    const response = await fetch("/api/family/tasks", {
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

  const deleteConfirm =
    "A tarefa some da lista e o histórico/fotos ligados a ela também. Os pontos já ganhos pela criança continuam.";

  const emptyCopy =
    list.length === 0
      ? { title: "Nenhuma tarefa ainda.", action: "Criar a primeira", href: "/app/tarefas/nova" }
      : inMonth.length === 0
        ? { title: "Nenhuma tarefa neste mês.", action: null, href: null }
        : { title: "Nada neste filtro.", action: "Ver todas", href: null };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FilterCard
          label="Para aprovar"
          value={counts.awaiting}
          active={statusFilter === "awaiting_approval"}
          highlight={counts.awaiting > 0}
          onClick={() => setStatusFilter((current) => (current === "awaiting_approval" ? "all" : "awaiting_approval"))}
        />
        <FilterCard
          label="Em andamento"
          value={counts.open}
          active={statusFilter === "pending"}
          onClick={() => setStatusFilter((current) => (current === "pending" ? "all" : "pending"))}
        />
        <FilterCard
          label="Feitas"
          value={counts.done}
          active={statusFilter === "completed"}
          onClick={() => setStatusFilter((current) => (current === "completed" ? "all" : "completed"))}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-navy/5 sm:flex-row sm:items-end sm:justify-between">
        <MonthSelect
          value={month}
          months={months}
          onChange={(next) => {
            setMonth(next);
            setSelected([]);
            setStatusFilter("all");
          }}
        />
        <div className="space-y-2 sm:text-right">
          <p className="text-xs font-semibold text-navy/55">Excluir apaga a tarefa e as fotos. Os pontos já ganhos ficam.</p>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={visible.length === 0}
                className="h-4 w-4 accent-royal"
                aria-label="Selecionar todas do mês"
              />
              Todos
            </label>
            <button
              type="button"
              disabled={pending || selected.length === 0}
              onClick={() =>
                void removeIds(
                  selected,
                  selected.length === 1
                    ? `Excluir esta tarefa? ${deleteConfirm}`
                    : `Excluir ${selected.length} tarefas? ${deleteConfirm}`,
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-alert/10 px-3 py-2 text-sm font-bold text-alert disabled:opacity-40"
              aria-label="Excluir selecionadas"
            >
              <TrashIcon />
              {selected.length > 0 ? `Excluir (${selected.length})` : "Excluir"}
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-navy/5">
          <p className="font-bold">{emptyCopy.title}</p>
          {emptyCopy.action && emptyCopy.href ? (
            <Link href={emptyCopy.href} className="mt-4 inline-block rounded-xl bg-royal px-4 py-2 font-bold text-white">
              {emptyCopy.action}
            </Link>
          ) : emptyCopy.action ? (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="mt-4 rounded-xl bg-royal px-4 py-2 font-bold text-white"
            >
              {emptyCopy.action}
            </button>
          ) : (
            <p className="mt-2 text-sm text-navy/60">Escolha outro mês ou “Todos os meses”.</p>
          )}
        </div>
      ) : (
        <div className="grid min-w-0 gap-3">
          {visible.map((task) => {
            const step = nextStep(task.status);
            const waiting = task.status === "awaiting_approval";
            return (
              <div
                key={task.id}
                className={`flex min-w-0 items-start gap-3 rounded-2xl bg-white p-4 ring-1 ${
                  waiting ? "ring-gold/40" : "ring-navy/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(task.id)}
                  onChange={() => toggleOne(task.id)}
                  className="mt-3 h-4 w-4 shrink-0 accent-royal"
                  aria-label={`Selecionar ${task.title}`}
                />
                <span aria-hidden className="mt-0.5">
                  <KidAvatar name={task.childName} size="sm" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-navy/60">{task.childName}</p>
                  <p className="wrap-break-word font-extrabold">{task.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block max-w-full wrap-break-word rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[task.status] ?? STATUS_CLASS.pending}`}
                    >
                      {STATUS_LABEL[task.status] ?? task.status}
                      {task.kind === "points" ? ` · ${task.weight} pts` : " · lembrete"}
                    </span>
                    {step ? (
                      <Link href={step.href} className="text-sm font-bold text-royal hover:underline">
                        {step.label}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void removeIds([task.id], `Excluir esta tarefa? ${deleteConfirm}`)}
                  className="inline-flex shrink-0 rounded-xl bg-alert/10 p-2 text-alert disabled:opacity-40"
                  aria-label={`Excluir ${task.title}`}
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterCard({
  label,
  value,
  active,
  highlight = false,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl p-4 text-left ring-1 transition ${
        active
          ? "bg-royal text-white ring-royal"
          : highlight
            ? "bg-gold/20 ring-gold/40 hover:ring-royal/40"
            : "bg-white ring-navy/5 hover:ring-royal/40"
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-wide ${active ? "text-white/70" : "text-navy/50"}`}>{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </button>
  );
}
