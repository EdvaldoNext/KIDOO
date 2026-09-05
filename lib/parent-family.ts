import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { isParentRole } from "@/lib/auth";

export async function requireParentFamilyId() {
  if (DEV_BYPASS_AUTH) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(DEV_FAMILY_COOKIE)?.value;
    if (fromCookie) return fromCookie;

    const admin = createServiceClient();
    const { data } = await admin
      .from("families")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const role = data?.claims?.app_metadata?.role;
  const familyId = data?.claims?.app_metadata?.family_id as string | undefined;
  if (!familyId || !isParentRole(role)) return null;
  return familyId;
}
