import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/backend/admin";
import {
  authAdmin,
  checkPassword,
  findUserByEmail,
  findUserById,
  getPasswordHash,
  setPassword,
  touchLastSignIn,
} from "@/lib/backend/auth-users";
import { setSessionCookie, signSession } from "@/lib/backend/session";
import { clearSignedOut, withDevKidsSession } from "@/lib/dev-cookies";

export async function syncProfileAuthClaims(profileId: string) {
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, family_id, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile?.family_id) return profile;

  const { data: userData } = await admin.auth.admin.getUserById(profileId);
  const platformAdmin = userData.user?.app_metadata?.platform_admin === true;
  const current = userData.user?.app_metadata ?? {};
  if (
    current.family_id === profile.family_id &&
    current.role === profile.role &&
    Boolean(current.platform_admin) === platformAdmin
  ) {
    return profile;
  }

  await admin.auth.admin.updateUserById(profileId, {
    app_metadata: {
      role: profile.role,
      family_id: profile.family_id,
      platform_admin: platformAdmin,
    },
  });
  return profile;
}

/**
 * Accounts imported from Supabase may arrive without a password hash. While the old project is
 * still reachable (LEGACY_SUPABASE_URL / LEGACY_SUPABASE_ANON_KEY), the first successful login
 * is verified against it and the password is then stored here, so nobody has to reset anything.
 */
async function legacyPasswordMatches(email: string, password: string) {
  const url = process.env.LEGACY_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.LEGACY_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;

  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function emailPasswordMatches(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return false;

  const hash = await getPasswordHash(user.id);
  let matches = await checkPassword(password, hash);

  if (!matches && !hash && (await legacyPasswordMatches(user.email ?? email, password))) {
    await setPassword(user.id, password);
    matches = true;
  }
  if (!matches) return false;

  if (!user.email_confirmed_at) {
    const confirmed = await authAdmin.updateUserById(user.id, { email_confirm: true });
    if (confirmed.error) {
      throw new Error(confirmed.error.message);
    }
  }
  return true;
}

/** Signs the user in on this response: sets the session cookie with fresh claims from the database. */
export async function attachProfileSession(
  response: NextResponse,
  profileId: string,
  secure = process.env.NODE_ENV === "production",
) {
  const user = await findUserById(profileId);
  if (!user) {
    throw new Error("Conta sem acesso para entrar.");
  }

  const token = await signSession({ id: user.id, email: user.email, app_metadata: user.app_metadata });
  setSessionCookie(response, token, secure);
  await touchLastSignIn(user.id).catch(() => undefined);
  return response;
}

export async function attachChildDeviceSession(
  response: NextResponse,
  familyId: string,
  childId: string,
  secure: boolean,
) {
  clearSignedOut(withDevKidsSession(response, familyId, childId, secure), secure);
  try {
    await syncProfileAuthClaims(childId);
    await attachProfileSession(response, childId, secure);
  } catch (error) {
    console.error("child device session", error);
  }
  return response;
}
