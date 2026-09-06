export const KIDS_PLAY_STORE_URL = process.env.NEXT_PUBLIC_KIDS_PLAY_STORE_URL ?? "";

export function isAndroidPhone() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
}
