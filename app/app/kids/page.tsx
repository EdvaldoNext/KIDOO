import type { ReactNode } from "react";
import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { KidsScoreboard } from "@/components/kids/KidsScoreboard";
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

function TaskCard({ task, reward }: { task: Task; reward: FamilyReward | null }) {
  const dueLabel = formatTaskDueAt(task.due_at);

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
      {task.status === "pending" ? (
        <Link
          href={`/app/kids/concluir/${task.id}`}
          className="mt-3 inline-block rounded-2xl bg-success px-5 py-2.5 font-extrabold text-navy"
        >
          Concluir
        </Link>
      ) : (
        <p className="mt-3 font-bold text-royal">Esperando os pais olharem a foto.</p>
      )}
    </div>
  );
}

export default async function KidsHomePage() {
  const { supabase, familyId, childId, devMode } = await getAppContext();
  const now = new Date();

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

  let scoresQuery = supabase
    .from("monthly_scores")
    .select("child_id, credits, debits, balance")
    .eq("year", now.getFullYear())
    .eq("month", now.getMonth() + 1);

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
    scoresQuery = scoresQuery.eq("family_id", familyId);
  }
  if (!devMode && childId) {
    tasksQuery = tasksQuery.eq("assigned_child_id", childId);
    childrenQuery = childrenQuery.eq("id", childId);
    scoresQuery = scoresQuery.eq("child_id", childId);
  }

  const [{ data: tasks }, { data: children }, { data: scores }, reward] = await Promise.all([
    tasksQuery,
    childrenQuery,
    scoresQuery,
    loadFamilyReward(supabase, familyId),
  ]);
  const kids = children ?? [];
  const openTasks = tasks ?? [];
  const pendingByChild: Record<string, number> = {};
  for (const task of openTasks) {
    if (task.kind !== "points") continue;
    pendingByChild[task.assigned_child_id] = (pendingByChild[task.assigned_child_id] ?? 0) + (task.weight ?? 0);
  }
  const canView = devMode || Boolean(childId);
  const manyKids = kids.length > 1;

  return (
    <div className="space-y-8">
      {!canView ? (
        <p className="rounded-2xl bg-white p-8 text-center font-bold text-navy/70">
          Peça aos pais o código e o PIN. Na tela inicial, toque em Sou filho(a)
          para entrar.
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <SectionTitle>{manyKids ? "Filhos" : "Meus ganhos"}</SectionTitle>
            {kids.length === 0 ? (
              <p className="rounded-2xl bg-white p-6 text-center font-bold text-navy/70">
                Cadastre um filho para começar.
              </p>
            ) : (
              <KidsScoreboard
                kids={kids}
                scores={scores ?? []}
                pendingByChild={pendingByChild}
                reward={reward}
                hrefForKid={manyKids ? (id) => `#tarefas-${id}` : undefined}
              />
            )}
          </section>

          <section className="space-y-4">
            <SectionTitle>{manyKids ? "Tarefas dos filhos" : "Minhas tarefas"}</SectionTitle>
            {kids.length === 0 ? null : manyKids ? (
              kids.map((kid) => (
                <ChildTasks key={kid.id} kid={kid} tasks={openTasks} reward={reward} />
              ))
            ) : openTasks.length === 0 ? (
              <p className="rounded-2xl bg-white p-6 text-center font-bold text-navy/70">
                Nenhuma tarefa agora. Mandou bem!
              </p>
            ) : (
              <div className="space-y-3">
                {openTasks.map((task) => (
                  <TaskCard key={task.id} task={task} reward={reward} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ChildTasks({
  kid,
  tasks,
  reward,
}: {
  kid: Kid;
  tasks: Task[];
  reward: FamilyReward | null;
}) {
  const childTasks = tasks.filter((task) => task.assigned_child_id === kid.id);

  return (
    <div id={`tarefas-${kid.id}`} className="scroll-mt-4 space-y-3">
      <h3 className="capitalize text-sm font-extrabold tracking-wide text-royal">{kid.display_name}</h3>
      {childTasks.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 font-bold text-navy/60 ring-1 ring-navy/5">Nenhuma tarefa agora.</p>
      ) : (
        childTasks.map((task) => <TaskCard key={task.id} task={task} reward={reward} />)
      )}
    </div>
  );
}
