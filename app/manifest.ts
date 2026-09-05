import type { MetadataRoute } from "next";
import { KIDO_PWA_ICONS, resolveKidsPwaIdentity } from "@/lib/kids-pwa";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { appName } = await resolveKidsPwaIdentity();

  return {
    name: appName,
    short_name: "KIDOO",
    description: "Tarefas em família com prova em foto",
    start_url: "/app/kids",
    scope: "/",
    display: "standalone",
    background_color: "#F4F7FB",
    theme_color: "#187bcd",
    lang: "pt-BR",
    icons: KIDO_PWA_ICONS,
  };
}
