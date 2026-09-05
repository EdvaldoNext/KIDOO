import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DevModeBanner } from "@/components/DevModeBanner";
import { SignOutButton } from "@/components/SignOutButton";
import { getAppContext } from "@/lib/app-context";
import { KidsNav } from "@/components/kids/KidsNav";
import { kidsPointsNavLabel, loadFamilyReward } from "@/lib/rewards";

export const dynamic = "force-dynamic";

export default async function KidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, familyId, childId } = await getAppContext();

  let childrenQuery = supabase
    .from("profiles")
    .select("id, display_name, age_group")
    .eq("role", "child")
    .order("created_at", { ascending: true });
  if (familyId) childrenQuery = childrenQuery.eq("family_id", familyId);

  const [{ data: kids }, reward] = await Promise.all([
    childrenQuery,
    loadFamilyReward(supabase, familyId),
  ]);
  const current = (kids ?? []).find((kid) => kid.id === childId);
  const headerName = current?.display_name ?? "";
  const huge = current?.age_group === "6_9";

  return (
    <div className={`min-h-full min-w-0 overflow-x-hidden bg-canvas ${huge ? "text-lg" : ""}`}>
      <DevModeBanner />
      <header className="flex items-center justify-between gap-2 bg-success px-4 py-4 text-navy">
        <BrandLogo size="sm" />
        {headerName ? <p className="min-w-0 truncate px-2 text-center font-extrabold">{headerName}</p> : <span />}
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/entrar?trocar=1" className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold">
            Trocar
          </Link>
          <SignOutButton label="Sair" redirectTo="/entrar" />
        </div>
      </header>
      <KidsNav pointsLabel={kidsPointsNavLabel(reward)} />
      <main className="px-4 pb-10">{children}</main>
    </div>
  );
}
