import { type NextRequest, NextResponse } from "next/server";
import { AUTH_ENABLED } from "@/lib/config";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (!AUTH_ENABLED) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
