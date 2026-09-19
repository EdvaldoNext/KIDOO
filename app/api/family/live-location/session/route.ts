import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/app-context";
import { createServiceClient } from "@/utils/supabase/admin";
import { requireParentActor } from "@/lib/parent-family";
import {
  createLocationToken,
  familyAllowsLiveLocation,
  hashLocationToken,
  revokeFamilyLocationTokens,
} from "@/lib/live-location-server";

export async function POST() {
  const { familyId, childId } = await getAppContext();
  if (!familyId || !childId) {
    return NextResponse.json({ error: "Entre como a criança para compartilhar o local." }, { status: 403 });
  }

  const admin = createServiceClient();
  if (!(await familyAllowsLiveLocation(admin, familyId))) {
    return NextResponse.json({ error: "Rastreador desligado pelos pais.", tracking: false }, { status: 409 });
  }

  const token = createLocationToken();
  const { error } = await admin.from("child_location_tokens").insert({
    token_hash: hashLocationToken(token),
    child_id: childId,
    family_id: familyId,
  });

  const staleBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  await admin
    .from("child_location_tokens")
    .delete()
    .eq("child_id", childId)
    .lt("created_at", staleBefore);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    token,
    child_id: childId,
    family_id: familyId,
  });
}

export async function DELETE() {
  const actor = await requireParentActor();
  if (!actor?.familyId) {
    return NextResponse.json({ error: "Só os pais podem desligar o rastreador." }, { status: 403 });
  }

  const admin = createServiceClient();
  await revokeFamilyLocationTokens(admin, actor.familyId);
  return NextResponse.json({ ok: true });
}
