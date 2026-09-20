import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ENABLED } from "@/lib/config";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";
import { updateSession } from "@/utils/supabase/middleware";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

const PASSTHROUGH_AUTH_PATHS = new Set([
  "/api/auth/logout",
  "/api/auth/leave-session",
  "/api/auth/kids-logout",
]);

export async function proxy(request: NextRequest) {
  if (PASSTHROUGH_AUTH_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!AUTH_ENABLED) {
    const path = request.nextUrl.pathname;
    const hasChild = Boolean(request.cookies.get(DEV_CHILD_COOKIE)?.value);
    const switching = request.nextUrl.searchParams.get("trocar") === "1";

    if (path.startsWith("/app/kids") && !hasChild) {
      return redirectTo(request, "/entrar");
    }

    if (path === "/entrar" && !switching && hasChild) {
      return redirectTo(request, "/app/kids");
    }

    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
