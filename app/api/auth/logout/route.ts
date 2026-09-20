import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearDeviceCookies, isSecureRequest } from "@/lib/dev-cookies";
import { safeNextPath } from "@/lib/safe-next-path";

async function nextPath(request: Request, fallback: string) {
  try {
    const form = await request.formData();
    return safeNextPath(form.get("next"), fallback);
  } catch {
    return safeNextPath(new URL(request.url).searchParams.get("next"), fallback);
  }
}

export async function POST(request: Request) {
  const next = await nextPath(request, "/");
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  const cookieStore = await cookies();
  const secure = isSecureRequest(request);

  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure,
        httpOnly: true,
      });
    }
  }

  return clearDeviceCookies(response, secure);
}
