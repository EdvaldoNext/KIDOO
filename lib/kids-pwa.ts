import { cookies } from "next/headers";
import { createServiceClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { familyRole, isParentRole, type AppClaims } from "@/lib/auth";
import { DEV_CHILD_COOKIE } from "@/lib/kids-access";

export const PARENT_PWA_START_URL = "/app";
export const KIDS_PWA_START_URL = "/app/kids";
export const KIDS_PWA_MANIFEST_PATH = "/kids.webmanifest";

export const KIDO_PWA_ICONS = [
  { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" as const },
  { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" as const },
  { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" as const },
];

export type KidsPwaIdentity = {
  startUrl: "/app/kids" | "/app" | "/entrar";
  appName: string;
};

function namedApp(displayName: string | null | undefined) {
  const name = displayName?.trim();
  return name ? `KIDOO · ${name}` : "KIDOO";
}

export async function hasActiveKidsSession() {
  if (DEV_BYPASS_AUTH) {
    const cookieStore = await cookies();
    return Boolean(cookieStore.get(DEV_CHILD_COOKIE)?.value);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return familyRole(data?.claims as AppClaims | undefined) === "child";
}

export function parentPwaManifest() {
  return {
    id: PARENT_PWA_START_URL,
    name: "KIDOO",
    short_name: "KIDOO",
    description: "Tarefas em família com prova em foto",
    start_url: PARENT_PWA_START_URL,
    scope: "/",
    display: "standalone" as const,
    background_color: "#F4F7FB",
    theme_color: "#187bcd",
    lang: "pt-BR",
    icons: KIDO_PWA_ICONS,
  };
}

export function kidsPwaManifest(appName: string) {
  return {
    id: KIDS_PWA_START_URL,
    name: appName,
    short_name: "KIDOO",
    description: "Tarefas em família com prova em foto",
    start_url: KIDS_PWA_START_URL,
    scope: "/",
    display: "standalone",
    background_color: "#F4F7FB",
    theme_color: "#187bcd",
    lang: "pt-BR",
    icons: KIDO_PWA_ICONS,
  };
}

export async function resolveKidsPwaIdentity(): Promise<KidsPwaIdentity> {
  if (DEV_BYPASS_AUTH) {
    const cookieStore = await cookies();
    const childId = cookieStore.get(DEV_CHILD_COOKIE)?.value;
    if (!childId) return { startUrl: "/entrar", appName: "KIDOO" };

    try {
      const admin = createServiceClient();
      const { data } = await admin.from("profiles").select("display_name").eq("id", childId).maybeSingle();
      return { startUrl: KIDS_PWA_START_URL, appName: namedApp(data?.display_name) };
    } catch {
      return { startUrl: KIDS_PWA_START_URL, appName: "KIDOO" };
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
    return { startUrl: KIDS_PWA_START_URL, appName: namedApp(profile?.display_name) };
  }

  if (isParentRole(role)) return { startUrl: "/app", appName: "KIDOO" };

  return { startUrl: "/entrar", appName: "KIDOO" };
}
