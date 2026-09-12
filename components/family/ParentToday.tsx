import type { ReactNode } from "react";
import Link from "next/link";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/status";
import { prettyName } from "@/lib/names";
import { allowanceSnapshot, formatAllowanceMoney } from "@/lib/allowance";
import { formatRewardAmountWithUnit, isAllowanceMoney, type FamilyReward } from "@/lib/rewards";

type TodayTask = {
  id: string;
  title: string;
  status: string;
  weight: number | null;
  kind: string | null;
  assigned_child_id: string | null;
};

type TodayChild = {
  id: string;
  display_name: string;
};

function greetingLabel() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function uniqueNames(tasks: TodayTask[], names: Map<string, string>) {
  return [...new Set(tasks.map((task) => names.get(task.assigned_child_id ?? "")).filter(Boolean))] as string[];
}

function todaySubtitle(waiting: number, pending: number, tasks: TodayTask[], names: Map<string, string>) {
  if (waiting > 0) {
    const kids = uniqueNames(
      tasks.filter((task) => task.status === "awaiting_approval"),
      names,
    );
    if (kids.length === 1 && waiting === 1) return `${kids[0]} enviou uma foto. Vale conferir.`;
    if (kids.length === 1) return `${kids[0]} tem ${waiting} tarefas esperando você.`;
    return `${waiting} tarefas esperando sua aprovação.`;
  }
  if (pending > 0) {
    const kids = uniqueNames(
      tasks.filter((task) => task.status === "pending"),
      names,
    );
    if (kids.length === 1 && pending === 1) return `${kids[0]} ainda tem 1 tarefa aberta.`;
    return `${pending} tarefas em andamento na casa.`;
  }
  return "Nada pendente de aprovação agora.";
}

export function ParentToday({
  familyName,
  childrenList,
  tasks,
  monthPoints,
  monthPaid = 0,
  reward,
  locationOn,
  children,
}: {
  familyName: string | null;
  childrenList: TodayChild[];
  tasks: TodayTask[];
  monthPoints: number;
  monthPaid?: number;
  reward: FamilyReward | null;
  locationOn: boolean;
  children?: ReactNode;
}) {
  const names = new Map(childrenList.map((child) => [child.id, prettyName(child.display_name)]));
  const waiting = tasks.filter((task) => task.status === "awaiting_approval").length;
  const pending = tasks.filter((task) => task.status === "pending").length;
  const money = isAllowanceMoney(reward);
  const allowance = money ? allowanceSnapshot(monthPoints, monthPaid, reward) : null;
  const rewardHint = money ? "mesada do mês" : reward?.reward_mode === "symbolic" ? "combinado da casa" : "pontos do mês";
  const allowanceHint = allowance
    ? allowance.settled
      ? "Tudo em dia"
      : allowance.due > 0
        ? `${formatAllowanceMoney(allowance.due)} a pagar`
        : "Nada a pagar ainda"
    : rewardHint;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-navy/5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-navy/80">Fotos e o local da tarefa ficam só na família.</p>
        {locationOn ? (
          <Link href="/app/filhos" className="shrink-0 font-bold text-royal hover:underline">
            Rastreador ao vivo · abrir em Filhos
          </Link>
        ) : (
          <p className="shrink-0 text-navy/55">GPS da foto na conclusão. Rastreador em Filhos, se ligado.</p>
        )}
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-royal">
            {greetingLabel()}
            {familyName ? ` · ${familyName}` : ""}
          </p>
          <h1 className="text-2xl font-extrabold">Hoje na família</h1>
          <p className="text-navy/70">{todaySubtitle(waiting, pending, tasks, names)}</p>
        </div>
        <Link href="/app/tarefas/nova" className="rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Nova tarefa
        </Link>
      </div>

      {children}

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/app/aprovacoes"
          className={`rounded-2xl p-4 ring-1 transition hover:ring-royal/40 ${
            waiting > 0 ? "bg-gold/20 ring-gold/40" : "bg-white ring-navy/5"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-navy/50">Precisa de você</p>
          <p className="mt-1 text-3xl font-extrabold">{waiting}</p>
          <p className="text-sm font-semibold text-navy/65">{waiting === 1 ? "tarefa para aprovar" : "tarefas para aprovar"}</p>
        </Link>
        <Link href="/app/tarefas" className="rounded-2xl bg-white p-4 ring-1 ring-navy/5 transition hover:ring-royal/40">
          <p className="text-xs font-bold uppercase tracking-wide text-navy/50">Em andamento</p>
          <p className="mt-1 text-3xl font-extrabold">{pending}</p>
          <p className="text-sm font-semibold text-navy/65">{pending === 1 ? "tarefa aberta" : "tarefas abertas"}</p>
        </Link>
        <Link href="/app/pontos" className="rounded-2xl bg-white p-4 ring-1 ring-navy/5 transition hover:ring-royal/40">
          <p className="text-xs font-bold uppercase tracking-wide text-navy/50">Combinado</p>
          <p className="mt-1 text-3xl font-extrabold leading-none">
            {formatRewardAmountWithUnit(monthPoints, reward)}
          </p>
          <p className="mt-2 text-sm font-semibold text-navy/65">{allowanceHint}</p>
          {allowance?.hasPaid ? (
            <p className="mt-1 text-xs font-bold text-navy/55">Pago {formatAllowanceMoney(allowance.paid)}</p>
          ) : null}
        </Link>
      </div>

      <div className="grid gap-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-navy/5">
            <p className="font-bold">
              {childrenList.length === 0
                ? "Cadastre um filho para começar a criar tarefas."
                : "Nenhuma tarefa aberta. Que tal uma missão leve hoje?"}
            </p>
            <Link
              href={childrenList.length === 0 ? "/app/filhos" : "/app/tarefas/nova"}
              className="mt-4 inline-block rounded-xl bg-royal px-4 py-2 font-bold text-white"
            >
              {childrenList.length === 0 ? "Cadastrar filho" : "Criar tarefa"}
            </Link>
          </div>
        ) : (
          tasks.map((task) => {
            const childName = names.get(task.assigned_child_id ?? "") ?? "Filho(a)";
            const waitingApproval = task.status === "awaiting_approval";
            const href = waitingApproval ? "/app/aprovacoes" : "/app/tarefas";
            return (
              <Link
                key={task.id}
                href={href}
                aria-label={`${waitingApproval ? "Aprovar" : "Ver"} ${task.title} de ${childName}`}
                className="flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-navy/5 transition hover:ring-royal/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span aria-hidden>
                    <KidAvatar name={childName} size="sm" className="mt-0.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy/60">{childName}</p>
                    <p className="wrap-break-word font-extrabold">{task.title}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`w-fit max-w-full wrap-break-word rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[task.status]}`}>
                    {STATUS_LABEL[task.status]}
                    {task.kind === "points" && task.weight != null ? ` · ${task.weight} pts` : ""}
                  </span>
                  <span className="text-sm font-bold text-royal">{waitingApproval ? "Aprovar" : "Ver"}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
