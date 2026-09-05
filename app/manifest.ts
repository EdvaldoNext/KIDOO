import type { MetadataRoute } from "next";
import { parentPwaManifest } from "@/lib/kids-pwa";

export default function manifest(): MetadataRoute.Manifest {
  return parentPwaManifest();
}
