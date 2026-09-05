import { getAppContext } from "@/lib/app-context";
import { ChildrenManager } from "@/components/family/ChildrenManager";

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

  const [{ data: children }, { data: family }] = await Promise.all([
    childrenQuery,
    familyId
      ? supabase.from("families").select("kids_access_key").eq("id", familyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Filhos</h1>
      {primeiro === "1" ? (
        <p className="rounded-2xl bg-gold/30 px-4 py-3 font-semibold text-navy">
          Família pronta. Agora cadastre o primeiro filho e envie o link com a chave.
        </p>
      ) : (
        <p className="text-navy/70">
          Uma chave para a casa. Cada filho toca no próprio nome para entrar.
        </p>
      )}
      <ChildrenManager
        childrenList={children ?? []}
        kidsAccessKey={family?.kids_access_key ?? null}
      />
    </div>
  );
}
