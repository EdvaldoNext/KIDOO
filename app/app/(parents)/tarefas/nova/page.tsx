import { getAppContext } from "@/lib/app-context";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";

export default async function NewTaskPage() {
  const { supabase, familyId } = await getAppContext();

  let query = supabase.from("profiles").select("id, display_name").eq("role", "child").order("display_name");
  if (familyId) query = query.eq("family_id", familyId);

  const { data: children } = await query;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Nova tarefa</h1>
      <NewTaskForm childrenList={children ?? []} />
    </div>
  );
}
