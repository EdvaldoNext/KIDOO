import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/app-context";
import { ChildLiveTracker } from "@/components/family/ChildLiveTracker";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";
import { prettyName } from "@/lib/names";
import type { LiveLocationRow } from "@/lib/live-location";

export default async function ChildLivePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const { supabase, familyId } = await getAppContext();

  let childQuery = supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", childId)
    .eq("role", "child");
  if (familyId) childQuery = childQuery.eq("family_id", familyId);

  const [{ data: child }, familyResult, liveResult] = await Promise.all([
    childQuery.maybeSingle(),
    familyId
      ? supabase.from("families").select("location_24h_enabled").eq("id", familyId).maybeSingle()
      : Promise.resolve({ data: null }),
    familyId
      ? supabase
          .from("child_live_locations")
          .select("child_id, family_id, lat, lng, accuracy_m, heading, speed_mps, captured_at, sharing, source")
          .eq("family_id", familyId)
          .eq("child_id", childId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!child) notFound();

  const childName = prettyName(child.display_name);

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Rastreador ao vivo"
        title={childName}
        subtitle="Posição atual do app dos filhos — não é o local da última foto."
        action={
          <Link href="/app/filhos" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-royal ring-1 ring-navy/10">
            Voltar
          </Link>
        }
      />
      <ParentTrustStrip aside="O sinal some se o app estiver fechado.">
        Clique em outro filho na lista para trocar o mapa.
      </ParentTrustStrip>
      <ChildLiveTracker
        childId={child.id}
        childName={childName}
        locationOn={Boolean(familyResult.data?.location_24h_enabled)}
        initial={(liveResult.data as LiveLocationRow | null) ?? null}
      />
    </div>
  );
}
