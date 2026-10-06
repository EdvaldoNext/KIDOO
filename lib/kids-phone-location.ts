import { OPEN_GEO_OPTIONS, requestBrowserPosition, type GeoFailure, type GeoFix } from "@/lib/geo";

export type PhoneLocationResult =
  | { ok: true; fix: GeoFix }
  | GeoFailure
  | { ok: false; code: "rejected"; message: string; status: number; trackingOff: boolean };

/** Sends this phone's GPS as the child who just entered (family key + name). */
export async function sendThisPhoneLocation(): Promise<PhoneLocationResult> {
  const geo = await requestBrowserPosition(OPEN_GEO_OPTIONS);
  if (!geo.ok) return geo;

  let response: Response;
  try {
    response = await fetch("/api/family/live-location", {
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
  } catch {
    return { ok: false, code: "unknown", message: "Não deu para enviar o local agora." };
  }

  if (!response.ok) {
    let payload: { error?: string; tracking?: boolean } = {};
    try {
      payload = (await response.json()) as { error?: string; tracking?: boolean };
    } catch {
      payload = {};
    }
    return {
      ok: false,
      code: "rejected",
      status: response.status,
      trackingOff: response.status === 409 || payload.tracking === false,
      message: payload.error ?? "Não deu para enviar o local agora.",
    };
  }

  return geo;
}
