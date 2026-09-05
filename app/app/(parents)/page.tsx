import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/status";
import { FirstSteps } from "@/components/family/FirstSteps";
import { InstallParentApp } from "@/components/family/InstallParentApp";

export default async function ParentHomePage() {
  const { supabase, familyId } = await getAppContext();

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, weight, kind, assigned_child_id")
    .in("status", ["pending", "awaiting_approval"])
    .order("created_at", { ascending: false });

  let childrenQuery = supabase.from("profiles").select("id, display_name").eq("role", "child");

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
  }

  const { data: tasks } = await tasksQuery;
  const { data: children } = await childrenQuery;

  const names = new Map((children ?? []).map((c) => [c.id, c.display_name]));
  const waiting = (tasks ?? []).filter((t) => t.status === "awaiting_approval").length;

  if (!familyId) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-navy/5">
        <p className="text-navy/70">Nenhuma família ativa.</p>
        <Link href="/cadastro" className="mt-4 inline-block rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Criar família
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InstallParentApp />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Hoje na família</h1>
          <p className="text-navy/70">
            {waiting > 0
              ? `${waiting} tarefa(s) esperando sua aprovação.`
              : "Nada pendente de aprovação agora."}
          </p>
        </div>
        <Link href="/app/tarefas/nova" className="rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Nova tarefa
        </Link>
      </div>
      <FirstSteps childCount={(children ?? []).length} openTaskCount={(tasks ?? []).length} />
      <div className="grid gap-3">
        {(tasks ?? []).length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-navy/70 ring-1 ring-navy/5">
            {(children ?? []).length === 0
              ? "Cadastre um filho para começar a criar tarefas."
              : "Nenhuma tarefa aberta. Crie a primeira para os filhos."}
          </div>
        ) : (
          (tasks ?? []).map((task) => (
            <div
              key={task.id}
              className="flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-navy/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="wrap-break-word font-bold">{task.title}</p>
                <p className="text-sm text-navy/60">{names.get(task.assigned_child_id)}</p>
              </div>
              <span className={`w-fit max-w-full wrap-break-word rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[task.status]}`}>
                {STATUS_LABEL[task.status]}
                {task.kind === "points" ? ` · ${task.weight} pts` : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
