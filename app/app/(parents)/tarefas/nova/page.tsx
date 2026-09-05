import { getAppContext } from "@/lib/app-context";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";
import { ParentPageHeader } from "@/components/family/ParentPageHeader";
import { prettyName } from "@/lib/names";

export default async function NewTaskPage() {
  const { supabase, familyId } = await getAppContext();

  let query = supabase.from("profiles").select("id, display_name").eq("role", "child").order("display_name");
  if (familyId) query = query.eq("family_id", familyId);

  const { data: children } = await query;
  const childrenList = (children ?? []).map((child) => ({
    ...child,
    display_name: prettyName(child.display_name),
  }));

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Combinados da casa"
        title="Nova tarefa"
        subtitle="Algo claro e possível de hoje. Foto só quando fizer sentido."
      />
      <NewTaskForm childrenList={childrenList} />
    </div>
  );
}
