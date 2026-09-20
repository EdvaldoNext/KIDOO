import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { familyRole, isParentRole, type AppClaims, type UserRole } from "@/lib/auth";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";

export const DEV_FAMILY_COOKIE = "kidoo_dev_family_id";

export type AppContext = {
  supabase: SupabaseClient;
  familyId: string | null;
  userId: string | null;
  ownerId: string | null;
  childId: string | null;
  devMode: boolean;
};

async function resolveDevFamilyId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(DEV_FAMILY_COOKIE)?.value ?? null;
}

async function resolveDevProfiles(admin: SupabaseClient, familyId: string | null) {
  if (!familyId) {
    return { ownerId: null as string | null, childId: null as string | null };
  }

  const cookieStore = await cookies();
  const selectedChildId = cookieStore.get(DEV_CHILD_COOKIE)?.value;

  const [{ data: parents }, { data: selectedChild }] = await Promise.all([
    admin
      .from("profiles")
      .select("id")
      .eq("family_id", familyId)
      .in("role", ["owner", "parent"])
      .order("created_at", { ascending: true })
      .limit(1),
    selectedChildId
      ? admin
          .from("profiles")
          .select("id")
          .eq("id", selectedChildId)
          .eq("family_id", familyId)
          .eq("role", "child")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ownerId: parents?.[0]?.id ?? null,
    childId: selectedChild?.id ?? null,
  };
}

export async function getAppContext(): Promise<AppContext> {
  if (DEV_BYPASS_AUTH) {
    const supabase = createServiceClient();
    const familyId = await resolveDevFamilyId();
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
  const jwtFamilyId = claims?.app_metadata?.family_id ?? null;

  const cookieStore = await cookies();
  const cookieChildId = cookieStore.get(DEV_CHILD_COOKIE)?.value;
  let cookieChild: { id: string; family_id: string } | null = null;
  if (cookieChildId) {
    const admin = createServiceClient();
    const { data: child } = await admin
      .from("profiles")
      .select("id, family_id")
      .eq("id", cookieChildId)
      .eq("role", "child")
      .maybeSingle();
    cookieChild = child;
  }

  if (isParentRole(role)) {
    const sameFamily = cookieChild && jwtFamilyId && cookieChild.family_id === jwtFamilyId;
    return {
      supabase,
      familyId: jwtFamilyId,
      userId,
      ownerId: userId,
      childId: sameFamily ? cookieChild.id : null,
      devMode: false,
    };
  }

  if (cookieChild) {
    return {
      supabase: createServiceClient(),
      familyId: cookieChild.family_id,
      userId: cookieChild.id,
      ownerId: null,
      childId: cookieChild.id,
      devMode: false,
    };
  }

  return {
    supabase,
    familyId: jwtFamilyId,
    userId,
    ownerId: null,
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
