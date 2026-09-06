import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/app-context";
import type { LiveLocationRow } from "@/lib/live-location";

function asOptionalNumber(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const { supabase, familyId } = await getAppContext();
  if (!familyId) {
    return NextResponse.json({ error: "Família não encontrada." }, { status: 400 });
  }

  const childId = new URL(request.url).searchParams.get("childId");
  const [{ data: family }, locationsResult] = await Promise.all([
    supabase.from("families").select("location_24h_enabled").eq("id", familyId).maybeSingle(),
    (() => {
      let query = supabase
        .from("child_live_locations")
        .select("child_id, family_id, lat, lng, accuracy_m, heading, speed_mps, captured_at, sharing, source")
        .eq("family_id", familyId);
      if (childId) query = query.eq("child_id", childId);
      return query;
    })(),
  ]);

  if (locationsResult.error) {
    return NextResponse.json({ error: locationsResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    location_24h_enabled: Boolean(family?.location_24h_enabled),
    locations: (locationsResult.data ?? []) as LiveLocationRow[],
  });
}

export async function POST(request: Request) {
  const { supabase, familyId, childId } = await getAppContext();
  if (!familyId || !childId) {
    return NextResponse.json({ error: "Entre como a criança para compartilhar o local." }, { status: 403 });
  }

  const { data: family } = await supabase
    .from("families")
    .select("location_24h_enabled")
    .eq("id", familyId)
    .maybeSingle();

  if (!family?.location_24h_enabled) {
    return NextResponse.json({ error: "Rastreador desligado." }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  const row = {
    child_id: childId,
    family_id: familyId,
    lat,
    lng,
    accuracy_m: asOptionalNumber(body.accuracy_m),
    heading: asOptionalNumber(body.heading),
    speed_mps: asOptionalNumber(body.speed_mps),
    captured_at: new Date().toISOString(),
    sharing: true,
    source: "pwa_foreground" as const,
  };

  const { data, error } = await supabase
    .from("child_live_locations")
    .upsert(row, { onConflict: "child_id" })
    .select("child_id, family_id, lat, lng, accuracy_m, heading, speed_mps, captured_at, sharing, source")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, location: data as LiveLocationRow });
}
