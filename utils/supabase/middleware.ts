import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  familyRole,
  isParentRole,
  isPlatformAdmin,
  type AppClaims,
} from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as AppClaims | null;
  const path = request.nextUrl.pathname;

  const admin = isPlatformAdmin(claims);
  const role = familyRole(claims);
  const authed = Boolean(claims?.sub);

  function redirect(to: string) {
    const url = request.nextUrl.clone();
    url.pathname = to;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }

  const isAdminPath = path.startsWith("/admin");
  const isAdminLogin = path === "/admin/login";
  const isKidsPath = path.startsWith("/app/kids");
  const isFamilyApp = path.startsWith("/app");
  const isKidsEntry = path === "/entrar";
  const isFamilyLogin = path === "/login" || path === "/cadastro" || path === "/onboarding" || isKidsEntry;

  if (isAdminPath) {
    if (isAdminLogin) {
      if (admin) return redirect("/admin");
      if (authed && !admin) return redirect(role === "child" ? "/app/kids" : "/app");
      return supabaseResponse;
    }
    if (!admin) {
      return redirect("/admin/login");
    }
    return supabaseResponse;
  }

  if (isKidsPath) {
    if (!authed) return redirect("/entrar");
    if (admin) return redirect("/admin");
    if (role !== "child") return redirect("/app");
    return supabaseResponse;
  }

  if (isFamilyApp) {
    if (!authed) return redirect("/login");
    if (admin) return redirect("/admin");
    if (role === "child") return redirect("/app/kids");
    if (!isParentRole(role)) return redirect("/onboarding");
    return supabaseResponse;
  }

  if (isFamilyLogin && authed) {
    if (admin) return redirect("/admin");
    if (role === "child") {
      if (isKidsEntry && request.nextUrl.searchParams.get("trocar") === "1") {
        return supabaseResponse;
      }
      return redirect("/app/kids");
    }
    if (isParentRole(role)) return redirect("/app");
  }

  return supabaseResponse;
}
