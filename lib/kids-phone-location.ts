import { requestBrowserPosition, type GeoResult } from "@/lib/geo";

/** Sends this phone's GPS as the child who just entered (family key + name). */
export async function sendThisPhoneLocation(): Promise<GeoResult> {
  const geo = await requestBrowserPosition();
  if (!geo.ok) return geo;

  await fetch("/api/family/live-location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lat: geo.fix.lat,
      lng: geo.fix.lng,
      accuracy_m: geo.fix.accuracyM,
      heading: geo.fix.heading,
      speed_mps: geo.fix.speedMps,
    }),
  });

  return geo;
}
