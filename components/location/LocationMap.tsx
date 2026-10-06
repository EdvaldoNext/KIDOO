"use client";

type LocationMapProps = {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
};

/** Mapa OpenStreetMap embutido — sem dependências externas. */
export function LocationMap({ lat, lng, label = "Localização", className = "h-48" }: LocationMapProps) {
  const delta = 0.006;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;

  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  return (
    <figure className="space-y-1">
      <div className={`relative overflow-hidden rounded-xl ring-1 ring-navy/10 ${className}`}>
        <iframe
          title={label}
          className="absolute inset-x-0 top-0 h-[calc(100%+4.5rem)] w-full border-0"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <figcaption className="px-1 text-xs font-semibold text-navy/55">{coords}</figcaption>
    </figure>
  );
}
