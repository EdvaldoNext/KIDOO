import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/status";

export default async function TasksPage() {
  const { supabase, familyId } = await getAppContext();

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, weight, kind, assigned_child_id")
    .order("created_at", { ascending: false });

  let childrenQuery = supabase.from("profiles").select("id, display_name").eq("role", "child");

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
  }

  const { data: tasks } = await tasksQuery;
  const { data: children } = await childrenQuery;
  const names = new Map((children ?? []).map((c) => [c.id, c.display_name]));

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-extrabold">Tarefas</h1>
        <Link href="/app/tarefas/nova" className="shrink-0 rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Nova
        </Link>
      </div>
      <div className="grid min-w-0 gap-3">
        {(tasks ?? []).map((task) => (
          <div key={task.id} className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-navy/5">
            <p className="wrap-break-word font-bold">{task.title}</p>
            <p className="text-sm text-navy/60">{names.get(task.assigned_child_id)}</p>
            <span className={`mt-2 inline-block max-w-full wrap-break-word rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[task.status]}`}>
              {STATUS_LABEL[task.status]} {task.kind === "points" ? `· ${task.weight} pts` : "· lembrete"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
