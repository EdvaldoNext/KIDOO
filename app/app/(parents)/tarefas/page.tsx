import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { TaskList } from "@/components/tasks/TaskList";
import { prettyName } from "@/lib/names";

export default async function TasksPage() {
  const { supabase, familyId } = await getAppContext();

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, weight, kind, assigned_child_id, created_at")
    .order("created_at", { ascending: false });

  let childrenQuery = supabase.from("profiles").select("id, display_name").eq("role", "child");

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
  }

  const [{ data: tasks }, { data: children }] = await Promise.all([tasksQuery, childrenQuery]);
  const names = new Map((children ?? []).map((child) => [child.id, prettyName(child.display_name)]));

  const items = (tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    weight: task.weight,
    kind: task.kind,
    childName: names.get(task.assigned_child_id) ?? "Filho(a)",
    createdAt: task.created_at,
  }));

  const waiting = items.filter((item) => item.status === "awaiting_approval").length;
  const open = items.filter((item) => item.status === "pending" || item.status === "awaiting_approval").length;
  const subtitle =
    waiting > 0
      ? `${waiting} ${waiting === 1 ? "tarefa esperando" : "tarefas esperando"} sua aprovação.`
      : open > 0
        ? `${open} ${open === 1 ? "tarefa aberta" : "tarefas abertas"} na casa.`
        : items.length > 0
          ? "Nada aberto agora. O histórico do mês continua aqui."
          : "Crie a primeira tarefa para os filhos.";

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-royal">Combinados da casa</p>
          <h1 className="text-2xl font-extrabold">Tarefas</h1>
          <p className="mt-1 text-navy/70">{subtitle}</p>
        </div>
        <Link href="/app/tarefas/nova" className="shrink-0 rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Nova tarefa
        </Link>
      </div>
      <TaskList key={items.map((item) => item.id).join(",")} items={items} />
    </div>
  );
}
