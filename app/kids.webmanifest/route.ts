import { NextResponse } from "next/server";
import { kidsPwaManifest, resolveKidsPwaIdentity } from "@/lib/kids-pwa";

export const dynamic = "force-dynamic";

export async function GET() {
  const { appName } = await resolveKidsPwaIdentity();

  return NextResponse.json(kidsPwaManifest(appName), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store",
    },
  });
}
