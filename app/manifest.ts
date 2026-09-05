import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KIDOO",
    short_name: "KIDOO",
    description: "Tarefas em família com prova em foto",
    start_url: "/login",
    display: "standalone",
    background_color: "#F4F7FB",
    theme_color: "#187bcd",
    lang: "pt-BR",
  };
}
