import type { ReactNode } from "react";
import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { RejectionFeedback, latestRejectionByTask } from "@/components/tasks/RejectionFeedback";
import { formatTaskDueAt } from "@/lib/dates";
import { formatRewardAmountWithUnit, loadFamilyReward, type FamilyReward } from "@/lib/rewards";
import { STATUS_LABEL } from "@/lib/status";

type Kid = { id: string; display_name: string };
type Task = {
  id: string;
  title: string;
  status: string;
  weight: number;
  kind: string;
  assigned_child_id: string;
  due_at: string | null;
};

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-extrabold sm:text-xl">{children}</h2>;
}

function TaskCard({
  task,
  reward,
  rejectionNote,
  canComplete,
  ownerName,
}: {
  task: Task;
  reward: FamilyReward | null;
  rejectionNote?: string | null;
  canComplete: boolean;
  ownerName?: string;
}) {
  const dueLabel = formatTaskDueAt(task.due_at);
  const wasRejected = task.status === "pending" && rejectionNote !== undefined;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-navy/5 sm:p-5">
      <p className="wrap-break-word text-xl font-extrabold sm:text-2xl">{task.title}</p>
      {dueLabel ? (
        <p className="mt-2 text-sm font-bold text-royal">Fazer até: {dueLabel}</p>
      ) : null}
      <p className="mt-1 text-navy/70">
        {STATUS_LABEL[task.status]}
        {task.kind === "points" ? ` · ${formatRewardAmountWithUnit(task.weight, reward)}` : ""}
      </p>
      {wasRejected && canComplete ? <RejectionFeedback note={rejectionNote ?? null} className="mt-3" /> : null}
      {task.status === "pending" && canComplete ? (
        <Link
          href={`/app/kids/concluir/${task.id}`}
          className="mt-3 inline-block rounded-2xl bg-success px-5 py-2.5 font-extrabold text-navy"
        >
          {wasRejected ? "Refazer" : "Concluir"}
        </Link>
      ) : task.status === "pending" ? (
        <p className="mt-3 font-bold text-navy/50">
          Tarefa de {ownerName ?? "outro filho"}. Só dá para olhar.
        </p>
      ) : (
        <p className="mt-3 font-bold text-royal">Esperando os pais olharem a foto.</p>
      )}
    </div>
  );
}

export default async function KidsHomePage() {
  const { supabase, familyId, childId, devMode } = await getAppContext();

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, weight, kind, require_photo, assigned_child_id, due_at")
    .in("status", ["pending", "awaiting_approval"])
    .order("created_at", { ascending: false });

  let childrenQuery = supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "child")
    .order("created_at", { ascending: true });

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
  }

  const [{ data: tasks }, { data: children }, reward] = await Promise.all([
    tasksQuery,
    childrenQuery,
    loadFamilyReward(supabase, familyId),
  ]);
  const kids = children ?? [];
  const openTasks = tasks ?? [];

  const pendingTaskIds = openTasks.filter((task) => task.status === "pending").map((task) => task.id);
  let rejectionsByTask = new Map<string, string | null>();

  if (pendingTaskIds.length > 0) {
    let rejectionsQuery = supabase
      .from("task_completions")
      .select("task_id, rejection_note, rejected_at")
      .in("task_id", pendingTaskIds)
      .not("rejected_at", "is", null)
      .order("rejected_at", { ascending: false });

    if (familyId) rejectionsQuery = rejectionsQuery.eq("family_id", familyId);

    const { data: rejections } = await rejectionsQuery;
    rejectionsByTask = latestRejectionByTask(rejections ?? []);
  }
  const canView = devMode || Boolean(childId);
  const manyKids = kids.length > 1;

  return (
    <div className="space-y-8">
      {!canView ? (
        <p className="rounded-2xl bg-white p-8 text-center font-bold text-navy/70">
          Peça aos pais o link e a chave da família para entrar.
        </p>
      ) : (
        <section className="space-y-4">
            <SectionTitle>{manyKids ? "Tarefas dos filhos" : "Minhas tarefas"}</SectionTitle>
            {kids.length === 0 ? null : manyKids ? (
              kids.map((kid) => (
                <ChildTasks
                  key={kid.id}
                  kid={kid}
                  currentKidId={childId}
                  tasks={openTasks}
                  reward={reward}
                  rejectionsByTask={rejectionsByTask}
                />
              ))
            ) : openTasks.length === 0 ? (
              <p className="rounded-2xl bg-white p-6 text-center font-bold text-navy/70">
                Nenhuma tarefa agora. Mandou bem!
              </p>
            ) : (
              <div className="space-y-3">
                {openTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    reward={reward}
                    canComplete={!childId || task.assigned_child_id === childId}
                    ownerName={kids.find((kid) => kid.id === task.assigned_child_id)?.display_name}
                    rejectionNote={
                      task.status === "pending" && rejectionsByTask.has(task.id)
                        ? rejectionsByTask.get(task.id) ?? null
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
        </section>
      )}
    </div>
  );
}

function ChildTasks({
  kid,
  currentKidId,
  tasks,
  reward,
  rejectionsByTask,
}: {
  kid: Kid;
  currentKidId: string | null;
  tasks: Task[];
  reward: FamilyReward | null;
  rejectionsByTask: Map<string, string | null>;
}) {
  const childTasks = tasks.filter((task) => task.assigned_child_id === kid.id);
  const isYou = currentKidId === kid.id;

  return (
    <div id={`tarefas-${kid.id}`} className="scroll-mt-4 space-y-3">
      <h3 className="capitalize text-sm font-extrabold tracking-wide text-royal">
        {kid.display_name}
        {isYou ? " · você" : ""}
      </h3>
      {childTasks.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 font-bold text-navy/60 ring-1 ring-navy/5">Nenhuma tarefa agora.</p>
      ) : (
        childTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            reward={reward}
            canComplete={isYou}
            ownerName={kid.display_name}
            rejectionNote={
              task.status === "pending" && rejectionsByTask.has(task.id)
                ? rejectionsByTask.get(task.id) ?? null
                : undefined
            }
          />
        ))
      )}
    </div>
  );
}
