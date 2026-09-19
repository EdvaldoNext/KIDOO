import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveLocationRow } from "@/lib/live-location";

export function hashLocationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createLocationToken() {
  return randomBytes(32).toString("hex");
}

function asOptionalNumber(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseLiveCoordinates(body: Record<string, unknown>) {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Coordenadas inválidas." as const };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Coordenadas inválidas." as const };
  }
  return {
    lat,
    lng,
    accuracy_m: asOptionalNumber(body.accuracy_m),
    heading: asOptionalNumber(body.heading),
    speed_mps: asOptionalNumber(body.speed_mps),
  };
}

export async function upsertLiveLocation(
  supabase: SupabaseClient,
  input: {
    childId: string;
    familyId: string;
    lat: number;
    lng: number;
    accuracy_m: number | null;
    heading: number | null;
    speed_mps: number | null;
    source: LiveLocationRow["source"];
  },
) {
  const row = {
    child_id: input.childId,
    family_id: input.familyId,
    lat: input.lat,
    lng: input.lng,
    accuracy_m: input.accuracy_m,
    heading: input.heading,
    speed_mps: input.speed_mps,
    captured_at: new Date().toISOString(),
    sharing: true,
    source: input.source,
  };

  return supabase
    .from("child_live_locations")
    .upsert(row, { onConflict: "child_id" })
    .select("child_id, family_id, lat, lng, accuracy_m, heading, speed_mps, captured_at, sharing, source")
    .maybeSingle();
}

export async function familyAllowsLiveLocation(admin: SupabaseClient, familyId: string) {
  const { data } = await admin
    .from("families")
    .select("location_24h_enabled")
    .eq("id", familyId)
    .maybeSingle();
  return Boolean(data?.location_24h_enabled);
}

export async function revokeFamilyLocationTokens(admin: SupabaseClient, familyId: string) {
  await admin.from("child_location_tokens").delete().eq("family_id", familyId);
}
