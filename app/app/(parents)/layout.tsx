import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DevModeBanner } from "@/components/DevModeBanner";
import { SignOutButton } from "@/components/SignOutButton";
import { ParentNav } from "@/components/family/ParentNav";
import { getAppContext } from "@/lib/app-context";
import { kidsPointsNavLabel } from "@/lib/rewards";

export const metadata: Metadata = {
  title: "KIDOO",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KIDOO",
    statusBarStyle: "default",
  },
};

export const dynamic = "force-dynamic";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, familyId } = await getAppContext();

  let waitingCount = 0;
  let pointsLabel = "Pontos";

  if (familyId) {
    const [waitingQuery, familyQuery] = await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("family_id", familyId)
        .eq("status", "awaiting_approval"),
      supabase.from("families").select("reward_mode, currency_amount").eq("id", familyId).maybeSingle(),
    ]);
    waitingCount = waitingQuery.count ?? 0;
    pointsLabel = kidsPointsNavLabel(familyQuery.data);
  }

  return (
    <div className="min-h-full min-w-0 overflow-x-hidden bg-canvas">
      <DevModeBanner />
      <header className="sticky top-0 z-20 border-b-2 border-gold bg-royal text-white">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/app" aria-label="KIDOO, ir para hoje" className="shrink-0">
            <BrandLogo size="nav" wordmark={false} className="ring-2 ring-white shadow-lg" />
          </Link>
          <SignOutButton label="Sair" />
        </div>
        <ParentNav waitingCount={waitingCount} pointsLabel={pointsLabel} />
      </header>
      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
