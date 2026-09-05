import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/app-context";
import { CompleteTask } from "@/components/kids/CompleteTask";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const { supabase, familyId } = await getAppContext();

  let query = supabase
    .from("tasks")
    .select("id, title, require_photo, kind, family_id, assigned_child_id, status")
    .eq("id", taskId);

  if (familyId) query = query.eq("family_id", familyId);

  const { data: task } = await query.single();

  if (!task || task.status !== "pending") notFound();

  return <CompleteTask task={task} />;
}
