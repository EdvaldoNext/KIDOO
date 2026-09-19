import { NextResponse } from "next/server";
import { appVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ version: appVersion() });
}
