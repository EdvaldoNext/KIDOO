import { getAppContext } from "@/lib/app-context";
import { LocationMap } from "@/components/location/LocationMap";
import { ApprovalActions } from "@/components/tasks/ApprovalActions";
import { STORAGE_BUCKET } from "@/lib/photo-key";

export default async function ApprovalsPage() {
  const { supabase, familyId } = await getAppContext();

  let completionsQuery = supabase
    .from("task_completions")
    .select("id, photo_key, captured_at, lat, lng, location_available, task_id, child_id, child_note")
    .is("approved_at", null)
    .is("rejected_at", null)
    .order("captured_at", { ascending: false });

  if (familyId) completionsQuery = completionsQuery.eq("family_id", familyId);

  const { data: completions } = await completionsQuery;

  let tasksQuery = supabase.from("tasks").select("id, title, weight");
  let childrenQuery = supabase.from("profiles").select("id, display_name").eq("role", "child");

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
  }

  const { data: tasks } = await tasksQuery;
  const { data: children } = await childrenQuery;

  const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]));
  const childMap = new Map((children ?? []).map((c) => [c.id, c.display_name]));

  const withPhotos = await Promise.all(
    (completions ?? []).map(async (item) => {
      let url: string | null = null;
      if (item.photo_key) {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(item.photo_key, 60 * 30);
        url = data?.signedUrl ?? null;
      }
      return { ...item, url };
    }),
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Aprovar fotos</h1>
      {withPhotos.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-navy/70 ring-1 ring-navy/5">
          Nenhuma foto aguardando.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {withPhotos.map((item) => {
            const task = taskMap.get(item.task_id);
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-navy/5">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="Prova da tarefa" className="h-56 w-full object-cover" />
                ) : (
                  <div className="grid h-56 place-items-center bg-canvas text-navy/50">Sem foto</div>
                )}
                <div className="space-y-3 p-4">
                  <p className="font-bold">{task?.title}</p>
                  <p className="text-sm text-navy/70">{childMap.get(item.child_id)}</p>
                  {item.child_note ? (
                    <p className="rounded-xl bg-canvas px-3 py-2 text-sm font-semibold text-navy">
                      “{item.child_note}”
                    </p>
                  ) : null}
                  <p className="text-sm text-navy/70">
                    {new Date(item.captured_at).toLocaleString("pt-BR")}
                  </p>
                  {item.location_available && item.lat != null && item.lng != null ? (
                    <div className="space-y-2">
                      <LocationMap lat={item.lat} lng={item.lng} label="Local da tarefa" />
                      <p className="text-xs text-navy/60">
                        GPS aproximado ({item.lat.toFixed(4)}, {item.lng.toFixed(4)}) — pode variar dentro de
                        casa.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-navy/70">Local não disponível</p>
                  )}
                  <ApprovalActions completionId={item.id} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
