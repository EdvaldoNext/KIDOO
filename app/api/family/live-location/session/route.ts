import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/app-context";
import { createServiceClient } from "@/utils/supabase/admin";
import { createLocationToken, hashLocationToken } from "@/lib/live-location-server";

export async function POST() {
  const { familyId, childId } = await getAppContext();
  if (!familyId || !childId) {
    return NextResponse.json({ error: "Entre como a criança para compartilhar o local." }, { status: 403 });
  }

  const admin = createServiceClient();
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
