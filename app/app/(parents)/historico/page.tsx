import { getAppContext } from "@/lib/app-context";
import { HistoryList } from "@/components/family/HistoryList";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";
import { STORAGE_BUCKET } from "@/lib/photo-key";
import { prettyName } from "@/lib/names";

export default async function HistoryPage() {
  const { supabase, familyId } = await getAppContext();

  if (!familyId) {
    return (
      <p className="text-navy/70">
        Crie uma família na tela inicial, em Sou pai ou mãe, para ver o histórico.
      </p>
    );
  }

  let completionsQuery = supabase
    .from("task_completions")
    .select("id, photo_key, captured_at, lat, lng, location_available, task_id, child_id, child_note")
    .order("captured_at", { ascending: false });

  let tasksQuery = supabase.from("tasks").select("id, title");
  let childrenQuery = supabase.from("profiles").select("id, display_name").eq("role", "child");

  completionsQuery = completionsQuery.eq("family_id", familyId);
  tasksQuery = tasksQuery.eq("family_id", familyId);
  childrenQuery = childrenQuery.eq("family_id", familyId);

  const [{ data: completions }, { data: tasks }, { data: children }] = await Promise.all([
    completionsQuery,
    tasksQuery,
    childrenQuery,
  ]);

  const taskMap = new Map((tasks ?? []).map((task) => [task.id, task.title]));
  const childMap = new Map((children ?? []).map((child) => [child.id, prettyName(child.display_name)]));

  const items = await Promise.all(
    (completions ?? []).map(async (item) => {
      let photoUrl: string | null = null;
      if (item.photo_key) {
        const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(item.photo_key, 60 * 30);
        photoUrl = data?.signedUrl ?? null;
      }
      return {
        id: item.id,
        capturedAt: item.captured_at,
        photoUrl,
        lat: item.lat,
        lng: item.lng,
        locationAvailable: item.location_available,
        taskTitle: taskMap.get(item.task_id) ?? "Tarefa",
        childName: childMap.get(item.child_id) ?? "Filho(a)",
        childNote: item.child_note,
      };
    }),
  );

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Memória da casa"
        title="Histórico"
        subtitle={
          items.length === 0
            ? "Quando alguém concluir uma tarefa, a foto e o local aparecem aqui."
            : "Foto, data e local de cada tarefa concluída."
        }
      />
      <ParentTrustStrip aside="Os pontos já ganhos ficam.">
        Excluir um registro apaga a foto deste histórico.
      </ParentTrustStrip>
      <HistoryList key={items.map((item) => item.id).join(",")} items={items} />
    </div>
  );
}
