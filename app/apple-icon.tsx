import { kidooIconResponse } from "@/lib/pwa-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return kidooIconResponse(180, 20);
}
