import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_ENABLED } from "@/lib/config";
import { clearDeviceCookies, isSecureRequest } from "@/lib/dev-cookies";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const cookieStore = await cookies();

  if (AUTH_ENABLED) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );
    await supabase.auth.signOut({ scope: "local" });
  }

  const secure = isSecureRequest(request);
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure,
      });
    }
  }

  return clearDeviceCookies(response, secure);
}
