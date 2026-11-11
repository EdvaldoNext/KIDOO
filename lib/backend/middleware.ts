import { type NextRequest, NextResponse } from "next/server";
import {
  familyRole,
  isParentRole,
  isPlatformAdmin,
} from "@/lib/auth";
import {
  SESSION_COOKIE,
  SESSION_REFRESH_AFTER,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/lib/backend/session";
import { SIGNED_OUT_COOKIE } from "@/lib/dev-cookies";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";

export async function updateSession(request: NextRequest) {
  let sessionResponse = NextResponse.next({ request });

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const claims = session?.claims ?? null;

  // Sliding session: active devices keep getting a fresh token, idle ones expire.
  if (session && claims?.sub && Date.now() / 1000 - session.issuedAt > SESSION_REFRESH_AFTER) {
    const token = await signSession({
      id: claims.sub,
      email: claims.email,
      app_metadata: claims.app_metadata,
    });
    const forwarded = request.headers.get("x-forwarded-proto");
    const secure = forwarded ? forwarded.split(",")[0]?.trim() === "https" : request.nextUrl.protocol === "https:";
    request.cookies.set(SESSION_COOKIE, token);
    sessionResponse = NextResponse.next({ request });
    sessionResponse.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(secure));
  }

  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/")) {
    return sessionResponse;
  }

  const admin = isPlatformAdmin(claims);
  const role = familyRole(claims);
  const authed = Boolean(claims?.sub);
  const hasChildCookie = Boolean(request.cookies.get(DEV_CHILD_COOKIE)?.value);
  const signedOut = Boolean(request.cookies.get(SIGNED_OUT_COOKIE)?.value);
  const kidsSession = !signedOut && (role === "child" || hasChildCookie);
  const parentSession = !signedOut && isParentRole(role);

  function redirect(to: string) {
    const url = request.nextUrl.clone();
    url.pathname = to;
    const response = NextResponse.redirect(url);
    sessionResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }

  const isAdminPath = path.startsWith("/admin");
  const isAdminLogin = path === "/admin/login";
  const isKidsPath = path.startsWith("/app/kids");
  const isFamilyApp = path.startsWith("/app");
  const isKidsEntry = path === "/entrar";
  const isPasswordReset = path === "/recuperar-senha" || path === "/redefinir-senha" || path.startsWith("/auth/");
  const isFamilyLogin = path === "/login" || path === "/cadastro" || path === "/onboarding" || isKidsEntry;

  if (isAdminPath) {
    if (isAdminLogin) {
      if (admin) return redirect("/admin");
      if (authed && !admin) return redirect(role === "child" ? "/app/kids" : "/app");
      return sessionResponse;
    }
    if (!admin) {
      return redirect("/admin/login");
    }
    return sessionResponse;
  }

  if (isKidsPath) {
    if (admin) return redirect("/admin");
    if (kidsSession) return sessionResponse;
    return redirect("/entrar");
  }

  if (isFamilyApp) {
    if (admin && !parentSession) return redirect("/admin");
    if (parentSession) return sessionResponse;
    if (kidsSession) return redirect("/app/kids");
    if (signedOut || !authed) return redirect("/");
    return redirect("/onboarding");
  }

  if (isPasswordReset) {
    return sessionResponse;
  }

  if (isFamilyLogin && authed && !signedOut) {
    if (admin && !isParentRole(role)) return redirect("/admin");
    if (role === "child" || (isKidsEntry && hasChildCookie)) {
      if (isKidsEntry && request.nextUrl.searchParams.get("trocar") !== "1") {
        return redirect("/app/kids");
      }
      return sessionResponse;
    }
    if (isParentRole(role) && !isKidsEntry) return redirect("/app");
  }

  return sessionResponse;
}
