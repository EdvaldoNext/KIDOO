import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { familyRole, isParentRole, type AppClaims } from "@/lib/auth";
import { isSecureRequest, withDevFamilySession } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as AppClaims | undefined;
  const familyId = claims?.app_metadata?.family_id;
  if (!familyId || !isParentRole(familyRole(claims))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return withDevFamilySession(NextResponse.json({ ok: true }), familyId, isSecureRequest(request));
}
