import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { LocationMap } from "@/components/location/LocationMap";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { prettyName } from "@/lib/names";

type ChildLocation = {
  childId: string;
  childName: string;
  lat: number;
  lng: number;
  capturedAt: string;
  taskTitle: string | null;
};

export default async function LocationPage() {
  const { supabase, familyId } = await getAppContext();

  let completionsQuery = supabase
    .from("task_completions")
    .select("child_id, lat, lng, location_available, captured_at, task_id")
    .eq("location_available", true)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("captured_at", { ascending: false })
    .limit(100);

  let childrenQuery = supabase.from("profiles").select("id, display_name").eq("role", "child");
  let tasksQuery = supabase.from("tasks").select("id, title");

  if (familyId) {
    completionsQuery = completionsQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
    tasksQuery = tasksQuery.eq("family_id", familyId);
  }

  const [{ data: completions }, { data: children }, { data: tasks }, familyResult] = await Promise.all([
    completionsQuery,
    childrenQuery,
    tasksQuery,
    familyId
      ? supabase.from("families").select("location_24h_enabled").eq("id", familyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const childMap = new Map((children ?? []).map((c) => [c.id, prettyName(c.display_name)]));
  const taskMap = new Map((tasks ?? []).map((t) => [t.id, t.title]));
  const locationOn = Boolean(familyResult.data?.location_24h_enabled);

  const latestByChild = new Map<string, ChildLocation>();
  for (const item of completions ?? []) {
    if (latestByChild.has(item.child_id)) continue;
    if (item.lat == null || item.lng == null) continue;
    latestByChild.set(item.child_id, {
      childId: item.child_id,
      childName: childMap.get(item.child_id) ?? "Filho(a)",
      lat: item.lat,
      lng: item.lng,
      capturedAt: item.captured_at,
      taskTitle: taskMap.get(item.task_id) ?? null,
    });
  }

  const locations = Array.from(latestByChild.values()).sort((a, b) =>
    a.childName.localeCompare(b.childName, "pt-BR"),
  );

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Prova da tarefa"
        title="Localização"
        subtitle={
          locations.length === 0
            ? "Ainda não há local registrado."
            : "Último local de cada criança ao concluir uma tarefa."
        }
      />
      <ParentTrustStrip
        aside={
          locationOn ? (
            <Link href="/app/configuracoes" className="font-bold text-royal hover:underline">
              Localização 24h ligada · gerenciar
            </Link>
          ) : (
            "Pode variar alguns metros dentro de casa."
          )
        }
      >
        GPS só no momento da foto, não um rastreador o dia todo.
      </ParentTrustStrip>

      {locations.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-navy/70 ring-1 ring-navy/5">
          <p className="font-bold">Nenhuma localização ainda.</p>
          <p className="mt-2 text-sm">
            Quando um filho concluir uma tarefa com GPS ativo, o mapa aparece aqui. Dá para testar em{" "}
            <Link href="/app/kids" className="font-bold text-royal underline">
              Tarefas (filhos)
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map((loc) => (
            <article key={loc.childId} className="overflow-hidden rounded-2xl bg-white ring-1 ring-navy/5">
              <LocationMap lat={loc.lat} lng={loc.lng} label={`Local de ${loc.childName}`} className="h-52" />
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-3">
                  <span aria-hidden>
                    <KidAvatar name={loc.childName} size="sm" />
                  </span>
                  <p className="font-extrabold">{loc.childName}</p>
                </div>
                {loc.taskTitle ? <p className="text-sm font-semibold">{loc.taskTitle}</p> : null}
                <p className="text-sm text-navy/70">
                  Registrado em {new Date(loc.capturedAt).toLocaleString("pt-BR")}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block pt-1 text-sm font-bold text-royal hover:underline"
                >
                  Abrir no Google Maps
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
