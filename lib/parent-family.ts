import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { isParentRole } from "@/lib/auth";

export async function requireParentActor() {
  if (DEV_BYPASS_AUTH) {
    const cookieStore = await cookies();
    const familyId = cookieStore.get(DEV_FAMILY_COOKIE)?.value ?? null;
    if (!familyId) return null;

    const admin = createServiceClient();
    const { data: owner } = await admin
      .from("profiles")
      .select("id")
      .eq("family_id", familyId)
      .in("role", ["owner", "parent"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return { familyId, parentId: owner?.id ?? null };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const parentId = data?.claims?.sub as string | undefined;
  if (!parentId) return null;

  const jwtRole = data?.claims?.app_metadata?.role;
  const jwtFamilyId = data?.claims?.app_metadata?.family_id as string | undefined;

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("family_id, role")
    .eq("id", parentId)
    .maybeSingle();

  const role = profile?.role ?? jwtRole;
  const familyId = profile?.family_id ?? jwtFamilyId;
  if (!familyId || !isParentRole(role)) return null;
  return { familyId, parentId };
}

export async function requireParentFamilyId() {
  const actor = await requireParentActor();
  return actor?.familyId ?? null;
}
