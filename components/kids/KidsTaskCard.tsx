import Link from "next/link";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { KidsMascot } from "@/components/kids/KidsMascot";
import { RejectionFeedback } from "@/components/tasks/RejectionFeedback";
import { formatKidsDueAt } from "@/lib/dates";
import { kidAccent, kidsStatusLabel, taskIcon } from "@/lib/kids-ui";
import { formatRewardAmountWithUnit, type FamilyReward } from "@/lib/rewards";

export type KidsTask = {
  id: string;
  title: string;
  status: string;
  weight: number;
  kind: string;
  assigned_child_id: string;
  due_at: string | null;
};

export function KidsTaskCard({
  task,
  reward,
  rejectionNote,
  canComplete,
  ownerName,
  ownerIsYou,
}: {
  task: KidsTask;
  reward: FamilyReward | null;
  rejectionNote?: string | null;
  canComplete: boolean;
  ownerName?: string;
  ownerIsYou?: boolean;
}) {
  const dueLabel = formatKidsDueAt(task.due_at);
  const wasRejected = task.status === "pending" && rejectionNote !== undefined;
  const rewardLabel = task.kind === "points" ? formatRewardAmountWithUnit(task.weight, reward) : null;
  const accent = kidAccent(ownerName ?? task.title);

  return (
    <article
      className={`relative overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-2 sm:p-5 ${
        ownerIsYou ? "ring-gold/70" : accent.ring
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${accent.bar}`} aria-hidden />
      <div className="flex items-start gap-3 pl-2">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-canvas text-3xl" aria-hidden>
          {taskIcon(task.title)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="wrap-break-word text-xl font-extrabold leading-tight sm:text-2xl">{task.title}</p>
          {dueLabel ? <p className="mt-1 text-sm font-extrabold text-royal">{dueLabel}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {rewardLabel ? (
              <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${accent.chip}`}>+{rewardLabel}</span>
            ) : (
              <span className="rounded-full bg-canvas px-3 py-1 text-sm font-extrabold text-navy/70">Lembrete</span>
            )}
            <span className="text-sm font-bold text-navy/70">{kidsStatusLabel(task.status)}</span>
          </div>
        </div>
      </div>

      {wasRejected && canComplete ? <RejectionFeedback note={rejectionNote ?? null} className="mt-3" /> : null}

      {task.status === "pending" && canComplete ? (
        <Link
          href={`/app/kids/concluir/${task.id}`}
          className="kids-pop mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-success px-5 py-3 text-lg font-extrabold text-navy shadow-[0_4px_0_#3a9a1f]"
        >
          {wasRejected ? "Tentar de novo" : "Já fiz!"}
        </Link>
      ) : task.status === "pending" ? (
        <p className="mt-3 rounded-2xl bg-canvas px-4 py-3 font-extrabold text-navy/80">
          Missão de {ownerName ?? "outra criança"}
          {rewardLabel ? ` · vale ${rewardLabel}` : ""}. Você pode olhar e se inspirar!
        </p>
      ) : (
        <p className="mt-3 rounded-2xl bg-royal/10 px-4 py-3 font-extrabold text-royal">
          Foto enviada! Os pais estão conferindo.
        </p>
      )}
    </article>
  );
}

export function KidsChildMissions({
  kid,
  isYou,
  tasks,
  reward,
  rejectionsByTask,
}: {
  kid: { id: string; display_name: string };
  isYou: boolean;
  tasks: KidsTask[];
  reward: FamilyReward | null;
  rejectionsByTask: Map<string, string | null>;
}) {
  const accent = kidAccent(kid.display_name);

  return (
    <section id={`tarefas-${kid.id}`} className="scroll-mt-4 space-y-3">
      <div className={`flex items-center gap-3 rounded-3xl px-3 py-3 ${isYou ? "bg-gold/25" : accent.soft}`}>
        <KidAvatar name={kid.display_name} size="sm" className={isYou ? "ring-4 ring-gold" : ""} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-extrabold capitalize">
            {kid.display_name}
            {isYou ? " · você" : ""}
          </h3>
        </div>
        <p className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-navy">
          {tasks.length === 0 ? "Livre!" : `${tasks.length} ${tasks.length === 1 ? "missão" : "missões"}`}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-3xl bg-white px-4 py-5 ring-1 ring-navy/5">
          <KidsMascot
            size="header"
            caption={isYou ? "Mandou bem! Nenhuma missão agora." : `${kid.display_name} já está em dia.`}
          />
        </div>
      ) : (
        tasks.map((task) => (
          <KidsTaskCard
            key={task.id}
            task={task}
            reward={reward}
            canComplete={isYou}
            ownerName={kid.display_name}
            ownerIsYou={isYou}
            rejectionNote={
              task.status === "pending" && rejectionsByTask.has(task.id)
                ? rejectionsByTask.get(task.id) ?? null
                : undefined
            }
          />
        ))
      )}
    </section>
  );
}
