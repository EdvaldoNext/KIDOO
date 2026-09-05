import { NextResponse } from "next/server";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

export function withDevKidsSession(
  response: NextResponse,
  familyId: string,
  childId?: string | null,
) {
  response.cookies.set(DEV_FAMILY_COOKIE, familyId, cookieOptions);
  if (childId) {
    response.cookies.set(DEV_CHILD_COOKIE, childId, cookieOptions);
  }
  return response;
}

export function clearDevChildCookie(response: NextResponse) {
  response.cookies.set(DEV_CHILD_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
