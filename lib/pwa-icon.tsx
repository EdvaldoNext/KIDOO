import { ImageResponse } from "next/og";

export function kidooIconResponse(size: number, safePadding = 0) {
  const inner = size - safePadding * 2;
  const fontSize = Math.round(inner * 0.52);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffc800",
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0a2540",
            fontSize,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          K
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
