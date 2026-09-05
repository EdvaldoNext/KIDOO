import { getAppContext } from "@/lib/app-context";
import { ChildrenManager } from "@/components/family/ChildrenManager";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ primeiro?: string }>;
}) {
  const { primeiro } = await searchParams;
  const { supabase, familyId } = await getAppContext();

  let query = supabase
    .from("profiles")
    .select("id, display_name, age_group, invite_code")
    .eq("role", "child")
    .order("created_at");

  if (familyId) query = query.eq("family_id", familyId);

  const { data: children } = await query;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Filhos</h1>
      {primeiro === "1" ? (
        <p className="rounded-2xl bg-gold/30 px-4 py-3 font-semibold text-navy">
          Família pronta. Agora cadastre o primeiro filho para ele poder entrar no app.
        </p>
      ) : (
        <p className="text-navy/70">
          Cada filho entra com o código e o PIN. Sem e-mail.
        </p>
      )}
      <ChildrenManager childrenList={children ?? []} />
    </div>
  );
}
