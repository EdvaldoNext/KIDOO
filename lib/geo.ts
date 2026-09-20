export type GeoFix = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  heading: number | null;
  speedMps: number | null;
};

export type GeoFailure = {
  ok: false;
  code: "unsupported" | "insecure" | "denied" | "unavailable" | "timeout" | "unknown";
  message: string;
};

export type GeoResult = { ok: true; fix: GeoFix } | GeoFailure;

export const PHOTO_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 15000,
};

export const LIVE_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 10000,
};

function failure(code: GeoFailure["code"], message: string): GeoFailure {
  return { ok: false, code, message };
}

export function readGeoFix(coords: GeolocationCoordinates): GeoFix {
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracyM: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
    heading: coords.heading != null && Number.isFinite(coords.heading) ? coords.heading : null,
    speedMps: coords.speed != null && Number.isFinite(coords.speed) ? coords.speed : null,
  };
}

export async function queryGeoPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

function mapGeoError(error: GeolocationPositionError): GeoFailure {
  if (error.code === error.PERMISSION_DENIED) {
    return failure(
      "denied",
      "Toque em Permitir quando o celular perguntar. Se não perguntar, toque no ícone ao lado do endereço e ative Localização.",
    );
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return failure("unavailable", "GPS indisponível agora. A foto vai mesmo assim.");
  }
  if (error.code === error.TIMEOUT) {
    return failure("timeout", "O GPS demorou. A foto vai mesmo assim.");
  }
  return failure("unknown", "Não deu para pegar o local. A foto vai mesmo assim.");
}

export function geoPreconditions(): GeoFailure | null {
  if (typeof window === "undefined") {
    return failure("unsupported", "Este aparelho não tem GPS no navegador.");
  }
  if (!window.isSecureContext) {
    return failure("insecure", "Abra em https ou localhost para o GPS funcionar.");
  }
  if (!navigator.geolocation) {
    return failure("unsupported", "Este aparelho não tem GPS no navegador.");
  }
  return null;
}

export function requestBrowserPosition(options: PositionOptions = PHOTO_GEO_OPTIONS): Promise<GeoResult> {
  const blocked = geoPreconditions();
  if (blocked) return Promise.resolve(blocked);

  const browserTimeout = options.timeout ?? PHOTO_GEO_OPTIONS.timeout ?? 8000;
  const hardTimeoutMs = browserTimeout + 1500;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: GeoResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      resolve(result);
    };

    const watchdog = window.setTimeout(() => {
      finish(failure("timeout", "O GPS demorou. A foto vai mesmo assim."));
    }, hardTimeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => finish({ ok: true, fix: readGeoFix(pos.coords) }),
      (error) => finish(mapGeoError(error)),
      options,
    );
  });
}

export function watchBrowserPosition(
  onFix: (fix: GeoFix) => void,
  onError?: (error: GeoFailure) => void,
  options: PositionOptions = LIVE_GEO_OPTIONS,
): () => void {
  const blocked = geoPreconditions();
  if (blocked) {
    onError?.(blocked);
    return () => undefined;
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => onFix(readGeoFix(pos.coords)),
    (error) => onError?.(mapGeoError(error)),
    options,
  );

  return () => navigator.geolocation.clearWatch(watchId);
}
