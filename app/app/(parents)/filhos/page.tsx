import { getAppContext } from "@/lib/app-context";
import { ChildrenManager } from "@/components/family/ChildrenManager";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ primeiro?: string }>;
}) {
  const { primeiro } = await searchParams;
  const { supabase, familyId } = await getAppContext();

  let childrenQuery = supabase
    .from("profiles")
    .select("id, display_name, age_group")
    .eq("role", "child")
    .order("created_at");

  if (familyId) childrenQuery = childrenQuery.eq("family_id", familyId);

  const [{ data: children }, { data: family }, liveResult] = await Promise.all([
    childrenQuery,
    familyId
      ? supabase.from("families").select("kids_access_key, location_24h_enabled").eq("id", familyId).maybeSingle()
      : Promise.resolve({ data: null }),
    familyId
      ? supabase.from("child_live_locations").select("child_id, captured_at").eq("family_id", familyId)
      : Promise.resolve({ data: [] }),
  ]);

  const liveCapturedAt: Record<string, string> = {};
  for (const row of liveResult.data ?? []) {
    liveCapturedAt[row.child_id] = row.captured_at;
  }

  const count = children?.length ?? 0;
  const firstTime = primeiro === "1";

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Quem mora aqui"
        title="Filhos"
        subtitle={
          firstTime
            ? "Família pronta. Cadastre o primeiro filho e envie o link com a chave."
            : count === 0
              ? "Cadastre quem vai usar o app das crianças."
              : count === 1
                ? "1 criança na casa. Cada uma entra pelo próprio nome."
                : `${count} crianças na casa. Clique no nome para ver a posição ao vivo.`
        }
      />
      <ParentTrustStrip aside="Sem e-mail nem senha para eles.">
        Uma chave para a casa. Só quem tem o link entra.
      </ParentTrustStrip>
      <ChildrenManager
        childrenList={children ?? []}
        kidsAccessKey={family?.kids_access_key ?? null}
        locationOn={Boolean(family?.location_24h_enabled)}
        liveCapturedAt={liveCapturedAt}
      />
    </div>
  );
}
