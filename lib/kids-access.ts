import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgeGroup } from "@/lib/auth";

export const KIDS_ENTRY_PATH = "/entrar";
export const DEV_CHILD_COOKIE = "kidoo_dev_child_id";
export const KIDS_KEY_PATTERN = /^CASA-[A-Z0-9]{6}$/;

export type KidsDoorChild = {
  id: string;
  display_name: string;
  age_group: AgeGroup | null;
};

export function generateKidsAccessKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CASA-${suffix}`;
}

export function normalizeKidsAccessKey(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export async function ensureKidsAccessKey(admin: SupabaseClient, familyId: string) {
  const { data: family } = await admin
    .from("families")
    .select("kids_access_key")
    .eq("id", familyId)
    .maybeSingle();

  if (family?.kids_access_key) return family.kids_access_key as string;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const key = generateKidsAccessKey();
    const { data: updated, error } = await admin
      .from("families")
      .update({ kids_access_key: key })
      .eq("id", familyId)
      .select("kids_access_key")
      .maybeSingle();

    if (!error && updated?.kids_access_key) return updated.kids_access_key as string;
  }

  throw new Error("Não foi possível gerar a chave da família.");
}

export async function findFamilyByKidsKey(admin: SupabaseClient, key: string) {
  const normalized = normalizeKidsAccessKey(key);
  if (!KIDS_KEY_PATTERN.test(normalized)) return null;

  const { data } = await admin
    .from("families")
    .select("id, kids_access_key")
    .eq("kids_access_key", normalized)
    .eq("status", "active")
    .maybeSingle();

  return data;
}

export async function listFamilyChildren(admin: SupabaseClient, familyId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, age_group")
    .eq("family_id", familyId)
    .eq("role", "child")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as KidsDoorChild[];
}

export async function signInAsChild(admin: SupabaseClient, childId: string) {
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(childId);
  const email = userData.user?.email;
  if (userError || !email) {
    throw new Error("Não foi possível entrar. Tente de novo.");
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link.properties?.hashed_token) {
    throw new Error("Não foi possível entrar. Tente de novo.");
  }

  return link.properties.hashed_token;
}
