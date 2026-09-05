import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/app-context";
import { CompleteTask } from "@/components/kids/CompleteTask";
import { KidsMascot } from "@/components/kids/KidsMascot";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const { supabase, familyId, childId } = await getAppContext();

  let query = supabase
    .from("tasks")
    .select("id, title, require_photo, kind, family_id, assigned_child_id, status")
    .eq("id", taskId);

  if (familyId) query = query.eq("family_id", familyId);

  const { data: task } = await query.single();

  if (!task || task.status !== "pending") notFound();

  if (childId && task.assigned_child_id !== childId) {
    const { data: owner } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", task.assigned_child_id)
      .maybeSingle();

    return (
      <div className="space-y-4 rounded-3xl bg-white p-6 ring-2 ring-royal/20">
        <KidsMascot size="header" />
        <h1 className="text-2xl font-extrabold">{task.title}</h1>
        <p className="font-extrabold text-navy/70">
          Essa missão é de {owner?.display_name ?? "outra criança"}. Dá para olhar e se inspirar, mas só{" "}
          {owner?.display_name ?? "ela"} pode concluir.
        </p>
        <Link href="/app/kids" className="inline-block rounded-2xl bg-royal px-5 py-3 font-extrabold text-white">
          Voltar às missões
        </Link>
      </div>
    );
  }

  let rejectionQuery = supabase
    .from("task_completions")
    .select("rejection_note")
    .eq("task_id", taskId)
    .not("rejected_at", "is", null)
    .order("rejected_at", { ascending: false })
    .limit(1);

  if (familyId) rejectionQuery = rejectionQuery.eq("family_id", familyId);

  const { data: rejection } = await rejectionQuery.maybeSingle();

  return (
    <CompleteTask
      task={task}
      rejectionNote={rejection ? (rejection.rejection_note ?? null) : undefined}
    />
  );
}
