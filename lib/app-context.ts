import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { familyRole, isParentRole, type AppClaims, type UserRole } from "@/lib/auth";

export const DEV_FAMILY_COOKIE = "kidoo_dev_family_id";

export type AppContext = {
  supabase: SupabaseClient;
  familyId: string | null;
  userId: string | null;
  ownerId: string | null;
  childId: string | null;
  devMode: boolean;
};

async function resolveDevFamilyId(admin: SupabaseClient): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(DEV_FAMILY_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  const { data } = await admin
    .from("families")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function resolveDevProfiles(admin: SupabaseClient, familyId: string | null) {
  if (!familyId) {
    return { ownerId: null as string | null, childId: null as string | null };
  }

  const [{ data: parents }, { data: children }] = await Promise.all([
    admin
      .from("profiles")
      .select("id")
      .eq("family_id", familyId)
      .in("role", ["owner", "parent"])
      .order("created_at", { ascending: true })
      .limit(1),
    admin
      .from("profiles")
      .select("id")
      .eq("family_id", familyId)
      .eq("role", "child")
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  return {
    ownerId: parents?.[0]?.id ?? null,
    childId: children?.[0]?.id ?? null,
  };
}

export async function getAppContext(): Promise<AppContext> {
  if (DEV_BYPASS_AUTH) {
    const supabase = createServiceClient();
    const familyId = await resolveDevFamilyId(supabase);
    const { ownerId, childId } = await resolveDevProfiles(supabase, familyId);

    return {
      supabase,
      familyId,
      userId: ownerId,
      ownerId,
      childId,
      devMode: true,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as AppClaims | undefined;
  const role = familyRole(claims) as UserRole | null;
  const userId = claims?.sub ?? null;
  const familyId = claims?.app_metadata?.family_id ?? null;

  return {
    supabase,
    familyId,
    userId,
    ownerId: isParentRole(role) ? userId : null,
    childId: role === "child" ? userId : null,
    devMode: false,
  };
}

export function familyFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  familyId: string | null,
) {
  return familyId ? query.eq("family_id", familyId) : query;
}
