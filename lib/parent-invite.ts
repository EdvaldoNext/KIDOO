import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateKidsAccessKey, KIDS_KEY_PATTERN, normalizeKidsAccessKey } from "@/lib/kids-access";

export const PARENT_KEY_PATTERN = /^PAIS-[A-Z0-9]{6}$/;

const PEPPER = "kidoo-parent-invite-v1";
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateParentAccessKey() {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)];
  }
  return `PAIS-${suffix}`;
}

export function normalizeParentAccessKey(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/** Stable key for families created before parent_access_key existed. */
export function legacyParentAccessKey(familyId: string) {
  const digest = createHmac("sha256", PEPPER).update(familyId).digest("hex");
  return `PAIS-${digest.slice(0, 6).toUpperCase()}`;
}

export function parentInviteCode(familyId: string) {
  return legacyParentAccessKey(familyId);
}

export function normalizeParentInviteCode(value: string) {
  return normalizeParentAccessKey(value);
}

export function matchesParentInvite(familyId: string, code: string) {
  return normalizeParentAccessKey(code) === legacyParentAccessKey(familyId);
}

export async function ensureParentAccessKey(admin: SupabaseClient, familyId: string) {
  const fallback = legacyParentAccessKey(familyId);

  try {
    const { data: family, error } = await admin
      .from("families")
      .select("parent_access_key")
      .eq("id", familyId)
      .maybeSingle();

    if (error) return fallback;

    const stored = typeof family?.parent_access_key === "string" ? family.parent_access_key.trim() : "";
    if (PARENT_KEY_PATTERN.test(stored)) return stored;

    const { data: updated } = await admin
      .from("families")
      .update({ parent_access_key: fallback })
      .eq("id", familyId)
      .select("parent_access_key")
      .maybeSingle();

    if (typeof updated?.parent_access_key === "string" && PARENT_KEY_PATTERN.test(updated.parent_access_key)) {
      return updated.parent_access_key;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export async function findFamilyByParentKeys(
  admin: SupabaseClient,
  kidsAccessKey: string,
  parentAccessKey: string,
) {
  const casa = normalizeKidsAccessKey(kidsAccessKey);
  const pais = normalizeParentAccessKey(parentAccessKey);
  if (!KIDS_KEY_PATTERN.test(casa) || !PARENT_KEY_PATTERN.test(pais)) return null;

  const { data: family, error } = await admin
    .from("families")
    .select("id, status, kids_access_key, parent_access_key")
    .eq("kids_access_key", casa)
    .eq("status", "active")
    .maybeSingle();

  const row = error
    ? (
        await admin
          .from("families")
          .select("id, status, kids_access_key")
          .eq("kids_access_key", casa)
          .eq("status", "active")
          .maybeSingle()
      ).data
    : family;

  if (!row?.id) return null;

  const expected = await ensureParentAccessKey(admin, row.id);
  if (pais !== expected) return null;
  return { id: row.id as string, kids_access_key: casa, parent_access_key: expected };
}

export function familyKeysOnCreate() {
  return {
    kids_access_key: generateKidsAccessKey(),
    parent_access_key: generateParentAccessKey(),
  };
}
