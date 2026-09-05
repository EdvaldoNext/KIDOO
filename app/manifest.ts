import type { MetadataRoute } from "next";
import { resolveKidsPwaIdentity } from "@/lib/kids-pwa";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { startUrl, appName } = await resolveKidsPwaIdentity();

  return {
    name: appName,
    short_name: "KIDOO",
    description: "Tarefas em família com prova em foto",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    background_color: "#F4F7FB",
    theme_color: "#187bcd",
    lang: "pt-BR",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
