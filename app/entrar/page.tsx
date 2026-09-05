import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { DevModeBanner } from "@/components/DevModeBanner";
import { KidsEnterFlow } from "@/components/kids/KidsEnterFlow";
import { hasActiveKidsSession, KIDS_PWA_MANIFEST_PATH } from "@/lib/kids-pwa";

export const metadata: Metadata = {
  manifest: KIDS_PWA_MANIFEST_PATH,
};

export default async function KidsEnterPage({
  searchParams,
}: {
  searchParams: Promise<{ trocar?: string }>;
}) {
  const { trocar } = await searchParams;
  if (trocar !== "1" && (await hasActiveKidsSession())) {
    redirect("/app/kids");
  }

  return (
    <div className="min-h-full">
      <DevModeBanner />
      <div className="flex flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8">
          <BrandLogo size="hero" wordmark={false} />
        </Link>
        <Suspense fallback={<p className="font-bold text-navy/70">Carregando...</p>}>
          <KidsEnterFlow />
        </Suspense>
      </div>
    </div>
  );
}
