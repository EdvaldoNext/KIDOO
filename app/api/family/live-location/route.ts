import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/app-context";
import { createServiceClient } from "@/utils/supabase/admin";
import type { LiveLocationRow } from "@/lib/live-location";
import {
  hashLocationToken,
  parseLiveCoordinates,
  upsertLiveLocation,
} from "@/lib/live-location-server";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
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
  const body = (await request.json()) as Record<string, unknown>;
  const coords = parseLiveCoordinates(body);
  if ("error" in coords) {
    return NextResponse.json({ error: coords.error }, { status: 400 });
  }

  const token = bearerToken(request);
  const source = token ? "native_background" : "pwa_foreground";

  let familyId: string | null = null;
  let childId: string | null = null;
  let supabase;

  if (token) {
    const admin = createServiceClient();
    const tokenHash = hashLocationToken(token);
    const { data: row } = await admin
      .from("child_location_tokens")
      .select("child_id, family_id")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ error: "Token de localização inválido." }, { status: 401 });
    }

    familyId = row.family_id;
    childId = row.child_id;
    supabase = admin;
    await admin
      .from("child_location_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);
  } else {
    const context = await getAppContext();
    supabase = context.supabase;
    familyId = context.familyId;
    childId = context.childId;
    if (!familyId || !childId) {
      return NextResponse.json({ error: "Entre como a criança para compartilhar o local." }, { status: 403 });
    }
  }

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

  const { data, error } = await upsertLiveLocation(supabase, {
    childId,
    familyId,
    ...coords,
    source,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, location: data as LiveLocationRow });
}
