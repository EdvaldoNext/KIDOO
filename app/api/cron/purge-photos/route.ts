import { NextResponse } from "next/server";
import { PHOTO_RETENTION_DAYS } from "@/lib/photo-retention";
import { purgeExpiredTaskPhotos } from "@/lib/purge-expired-photos";

export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!isCronRequest(request)) return unauthorized();

  try {
    const result = await purgeExpiredTaskPhotos();
    return NextResponse.json({
      ok: true,
      retentionDays: PHOTO_RETENTION_DAYS,
      ...result,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível apagar as fotos vencidas." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
