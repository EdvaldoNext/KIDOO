import { getAppContext } from "@/lib/app-context";
import { LocationMap } from "@/components/location/LocationMap";
import { ApprovalActions } from "@/components/tasks/ApprovalActions";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { STORAGE_BUCKET } from "@/lib/photo-key";
import { prettyName } from "@/lib/names";

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
  const childMap = new Map((children ?? []).map((c) => [c.id, prettyName(c.display_name)]));

  const withPhotos = await Promise.all(
    (completions ?? []).map(async (item) => {
      let url: string | null = null;
      if (item.photo_key) {
        const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(item.photo_key, 60 * 30);
        url = data?.signedUrl ?? null;
      }
      return { ...item, url };
    }),
  );

  const waiting = withPhotos.length;

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Olhar com calma"
        title="Aprovar fotos"
        subtitle={
          waiting === 0
            ? "Nada esperando agora."
            : waiting === 1
              ? "1 foto para conferir."
              : `${waiting} fotos para conferir.`
        }
      />
      <ParentTrustStrip aside="GPS aproximado, só desta tarefa.">
        A foto e o local ficam só na família.
      </ParentTrustStrip>
      {withPhotos.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-navy/5">
          <p className="font-bold">Nenhuma foto aguardando.</p>
          <p className="mt-2 text-sm text-navy/65">Quando alguém enviar prova, ela aparece aqui.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {withPhotos.map((item) => {
            const task = taskMap.get(item.task_id);
            const childName = childMap.get(item.child_id) ?? "Filho(a)";
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-gold/30">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={`Prova de ${task?.title ?? "tarefa"}`} className="h-56 w-full object-cover" />
                ) : (
                  <div className="grid h-56 place-items-center bg-canvas text-navy/50">Sem foto</div>
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden>
                      <KidAvatar name={childName} size="sm" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy/60">{childName}</p>
                      <p className="font-extrabold">{task?.title}</p>
                    </div>
                  </div>
                  {item.child_note ? (
                    <p className="rounded-xl bg-canvas px-3 py-2 text-sm font-semibold text-navy">
                      “{item.child_note}”
                    </p>
                  ) : null}
                  <p className="text-sm text-navy/70">{new Date(item.captured_at).toLocaleString("pt-BR")}</p>
                  {item.location_available && item.lat != null && item.lng != null ? (
                    <div className="space-y-2">
                      <LocationMap lat={item.lat} lng={item.lng} label="Local da tarefa" />
                      <p className="text-xs text-navy/60">
                        GPS aproximado ({item.lat.toFixed(4)}, {item.lng.toFixed(4)}) — pode variar dentro de casa.
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
