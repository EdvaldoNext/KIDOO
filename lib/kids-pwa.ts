import { cookies } from "next/headers";
import { createServiceClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { familyRole, isParentRole, type AppClaims } from "@/lib/auth";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";

export type KidsPwaIdentity = {
  startUrl: "/app/kids" | "/app" | "/entrar";
  appName: string;
};

function namedApp(displayName: string | null | undefined) {
  const name = displayName?.trim();
  return name ? `KIDOO · ${name}` : "KIDOO";
}

export async function resolveKidsPwaIdentity(): Promise<KidsPwaIdentity> {
  if (DEV_BYPASS_AUTH) {
    const cookieStore = await cookies();
    const childId = cookieStore.get(DEV_CHILD_COOKIE)?.value;
    if (!childId) return { startUrl: "/entrar", appName: "KIDOO" };

    try {
      const admin = createServiceClient();
      const { data } = await admin.from("profiles").select("display_name").eq("id", childId).maybeSingle();
      return { startUrl: "/app/kids", appName: namedApp(data?.display_name) };
    } catch {
      return { startUrl: "/app/kids", appName: "KIDOO" };
    }
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as AppClaims | undefined;
  const role = familyRole(claims);

  if (role === "child" && claims?.sub) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", claims.sub)
      .maybeSingle();
    return { startUrl: "/app/kids", appName: namedApp(profile?.display_name) };
  }

  if (isParentRole(role)) return { startUrl: "/app", appName: "KIDOO" };

  return { startUrl: "/entrar", appName: "KIDOO" };
}
