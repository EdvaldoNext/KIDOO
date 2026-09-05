import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ENABLED } from "@/lib/config";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (!AUTH_ENABLED) {
    const path = request.nextUrl.pathname;
    if (path === "/entrar" && request.nextUrl.searchParams.get("trocar") !== "1") {
      if (request.cookies.get(DEV_CHILD_COOKIE)?.value) {
        const url = request.nextUrl.clone();
        url.pathname = "/app/kids";
        url.search = "";
        return NextResponse.redirect(url);
      }
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
