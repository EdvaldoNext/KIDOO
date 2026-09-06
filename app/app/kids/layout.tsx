import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DevModeBanner } from "@/components/DevModeBanner";
import { SignOutButton } from "@/components/SignOutButton";
import { getAppContext } from "@/lib/app-context";
import { KidsNav } from "@/components/kids/KidsNav";
import { InstallKidsApp } from "@/components/kids/InstallKidsApp";
import { KIDS_PWA_MANIFEST_PATH, resolveKidsPwaIdentity } from "@/lib/kids-pwa";
import { kidsPointsNavLabel, loadFamilyReward } from "@/lib/rewards";
import { AutoRefresh } from "@/components/AutoRefresh";
import { KidsLiveLocation } from "@/components/kids/KidsLiveLocation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { appName } = await resolveKidsPwaIdentity();
  return {
    title: appName,
    manifest: KIDS_PWA_MANIFEST_PATH,
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: "default",
    },
  };
}

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

  const [{ data: kids }, reward, familyResult] = await Promise.all([
    childrenQuery,
    loadFamilyReward(supabase, familyId),
    familyId
      ? supabase.from("families").select("location_24h_enabled").eq("id", familyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const current = (kids ?? []).find((kid) => kid.id === childId);
  const headerName = current?.display_name ?? "";
  const huge = current?.age_group === "6_9";

  return (
    <div className={`kids-play min-h-full min-w-0 overflow-x-hidden ${huge ? "text-lg" : ""}`}>
      <DevModeBanner />
      <header className="flex items-center justify-between gap-2 bg-success px-4 py-3 text-navy">
        <Link href="/app/kids" aria-label="KIDOO, ir para as missões" className="shrink-0">
          <BrandLogo size="header" wordmark={false} />
        </Link>
        {headerName ? (
          <p className="min-w-0 truncate px-2 text-center font-extrabold">Oi, {headerName}!</p>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/entrar?trocar=1" className="rounded-2xl bg-white/20 px-3 py-2 text-sm font-extrabold">
            Trocar
          </Link>
          <SignOutButton label="Sair" redirectTo="/entrar" />
        </div>
      </header>
      <KidsNav pointsLabel={kidsPointsNavLabel(reward)} />
      <main className="px-4 pb-6">
        <AutoRefresh />
        <InstallKidsApp />
        <KidsLiveLocation
          enabled={Boolean(familyResult.data?.location_24h_enabled)}
          childId={childId}
        />
        {children}
        <div className="flex justify-center pt-8">
          <BrandLogo size="md" wordmark={false} />
        </div>
      </main>
    </div>
  );
}
