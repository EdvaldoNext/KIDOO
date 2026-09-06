export type LiveLocationRow = {
  child_id: string;
  family_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  heading: number | null;
  speed_mps: number | null;
  captured_at: string;
  sharing: boolean;
  source: "pwa_foreground" | "native_background";
};

export type LiveSignalStatus = "live" | "recent" | "offline";

export const LIVE_FRESH_MS = 45_000;
export const LIVE_RECENT_MS = 15 * 60_000;
export const LIVE_MOVE_METERS = 20;
export const LIVE_MIN_INTERVAL_MS = 15_000;

export function liveSignalStatus(capturedAt: string | null | undefined, now = Date.now()): LiveSignalStatus {
  if (!capturedAt) return "offline";
  const age = now - new Date(capturedAt).getTime();
  if (Number.isNaN(age) || age < 0) return "offline";
  if (age <= LIVE_FRESH_MS) return "live";
  if (age <= LIVE_RECENT_MS) return "recent";
  return "offline";
}

export function liveSignalLabel(status: LiveSignalStatus) {
  if (status === "live") return "Ao vivo";
  if (status === "recent") return "Há pouco";
  return "Sem sinal";
}

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function shouldPublishLiveFix(
  last: { lat: number; lng: number; at: number } | null,
  next: { lat: number; lng: number },
  now = Date.now(),
) {
  if (!last) return true;
  if (now - last.at >= LIVE_MIN_INTERVAL_MS) return true;
  return metersBetween(last, next) >= LIVE_MOVE_METERS;
}
