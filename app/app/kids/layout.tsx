import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DevModeBanner } from "@/components/DevModeBanner";
import { SignOutButton } from "@/components/SignOutButton";
import { getAppContext } from "@/lib/app-context";
import { kidsPointsNavLabel, loadFamilyReward } from "@/lib/rewards";

export default async function KidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, familyId, childId, devMode } = await getAppContext();

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
  const headerName = !devMode ? (current?.display_name ?? "") : "";
  const huge = current?.age_group === "6_9";

  return (
    <div className={`min-h-full min-w-0 overflow-x-hidden bg-canvas ${huge ? "text-lg" : ""}`}>
      <DevModeBanner />
      <header className="flex items-center justify-between gap-2 bg-success px-4 py-4 text-navy">
        <BrandLogo size="sm" />
        {headerName ? <p className="min-w-0 truncate px-2 text-center font-extrabold">{headerName}</p> : <span />}
        <SignOutButton label="Sair" />
      </header>
      <nav className="flex flex-wrap gap-2 px-4 py-3">
        <Link href="/app/kids" className="rounded-2xl bg-white px-4 py-3 font-extrabold ring-1 ring-navy/10">
          Tarefas
        </Link>
        <Link href="/app/kids/pontos" className="rounded-2xl bg-gold px-4 py-3 font-extrabold text-navy">
          {kidsPointsNavLabel(reward)}
        </Link>
      </nav>
      <main className="px-4 pb-10">{children}</main>
    </div>
  );
}
