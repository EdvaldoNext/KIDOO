import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";
import { familyRole, isParentRole, type AppClaims } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/config";
import { attachProfileSession } from "@/lib/auth-session";
import { isSecureRequest, withDevFamilySession, withDevKidsSession } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const familyId = cookieStore.get(DEV_FAMILY_COOKIE)?.value;
  const childId = cookieStore.get(DEV_CHILD_COOKIE)?.value;
  const secure = isSecureRequest(request);

  if (!AUTH_ENABLED) {
    if (childId && familyId) {
      return withDevKidsSession(NextResponse.json({ ok: true, role: "child" }), familyId, childId, secure);
    }
    if (familyId) {
      return withDevFamilySession(NextResponse.json({ ok: true, role: "parent" }), familyId, secure);
    }
    return NextResponse.json({ ok: false, role: null });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const role = familyRole(data?.claims as AppClaims | undefined);
  if (role === "child") {
    return NextResponse.json({ ok: true, role: "child" });
  }
  if (isParentRole(role)) {
    return NextResponse.json({ ok: true, role: "parent" });
  }

  if (!familyId) {
    return NextResponse.json({ ok: false, role: null });
  }

  try {
    const admin = createServiceClient();

    if (childId) {
      const { data: child } = await admin
        .from("profiles")
        .select("id, family_id, role")
        .eq("id", childId)
        .eq("family_id", familyId)
        .eq("role", "child")
        .maybeSingle();

      if (!child) {
        return NextResponse.json({ ok: false, role: null });
      }

      const response = withDevKidsSession(NextResponse.json({ ok: true, role: "child" }), familyId, child.id, secure);
      await attachProfileSession(response, child.id);
      return response;
    }

    const { data: parent } = await admin
      .from("profiles")
      .select("id")
      .eq("family_id", familyId)
      .in("role", ["owner", "parent"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!parent?.id) {
      return NextResponse.json({ ok: false, role: null });
    }

    const response = withDevFamilySession(NextResponse.json({ ok: true, role: "parent" }), familyId, secure);
    await attachProfileSession(response, parent.id);
    return response;
  } catch {
    return NextResponse.json({ ok: false, role: null });
  }
}
