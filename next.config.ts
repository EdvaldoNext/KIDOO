import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/kids.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/:path*",
        headers: [{ key: "Permissions-Policy", value: "geolocation=(self), camera=(self)" }],
      },
    ];
  },
};

export default nextConfig;
