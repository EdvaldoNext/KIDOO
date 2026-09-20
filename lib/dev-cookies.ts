import { NextResponse } from "next/server";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";

/** Keep the child/parent identity on the phone after the browser or PWA is closed. */
export const DEV_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/** Set only by Sair. Blocks auto-login until the person signs in again. */
export const SIGNED_OUT_COOKIE = "kidoo_signed_out";

export const DEV_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: DEV_COOKIE_MAX_AGE,
};

export function isSecureRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function deviceCookieOptions(secure = false) {
  return {
    ...DEV_COOKIE_OPTIONS,
    secure,
  };
}

export function withDevKidsSession(
  response: NextResponse,
  familyId: string,
  childId?: string | null,
  secure = false,
) {
  const options = deviceCookieOptions(secure);
  response.cookies.set(DEV_FAMILY_COOKIE, familyId, options);
  if (childId) {
    response.cookies.set(DEV_CHILD_COOKIE, childId, options);
  }
  return response;
}

export function withDevFamilySession(response: NextResponse, familyId: string, secure = false) {
  response.cookies.set(DEV_FAMILY_COOKIE, familyId, deviceCookieOptions(secure));
  return response;
}

export function clearDevChildCookie(response: NextResponse, secure = false) {
  response.cookies.set(DEV_CHILD_COOKIE, "", { ...deviceCookieOptions(secure), maxAge: 0 });
  return response;
}

export function clearDeviceCookies(response: NextResponse, secure = false) {
  const expired = { ...deviceCookieOptions(secure), maxAge: 0 };
  response.cookies.set(DEV_FAMILY_COOKIE, "", expired);
  response.cookies.set(DEV_CHILD_COOKIE, "", expired);
  return response;
}

/** Leave the panel but keep this phone linked to the family. */
export function keepFamilyDevice(response: NextResponse, secure = false) {
  return clearDevChildCookie(response, secure);
}

export function markSignedOut(response: NextResponse, secure = false) {
  response.cookies.set(SIGNED_OUT_COOKIE, "1", deviceCookieOptions(secure));
  return response;
}

export function clearSignedOut(response: NextResponse, secure = false) {
  response.cookies.set(SIGNED_OUT_COOKIE, "", { ...deviceCookieOptions(secure), maxAge: 0 });
  return response;
}
