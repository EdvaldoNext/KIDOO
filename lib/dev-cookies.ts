import { NextResponse } from "next/server";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";

/** Keep the child identity on the phone after the browser or PWA is closed. */
export const DEV_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export const DEV_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: DEV_COOKIE_MAX_AGE,
};

export function withDevKidsSession(
  response: NextResponse,
  familyId: string,
  childId?: string | null,
) {
  response.cookies.set(DEV_FAMILY_COOKIE, familyId, DEV_COOKIE_OPTIONS);
  if (childId) {
    response.cookies.set(DEV_CHILD_COOKIE, childId, DEV_COOKIE_OPTIONS);
  }
  return response;
}

export function clearDevChildCookie(response: NextResponse) {
  response.cookies.set(DEV_CHILD_COOKIE, "", { ...DEV_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
