import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    localPatterns: [
      { pathname: "/api/img/**" },
      { pathname: "/api/pi/**" }, // cached product-image route (base64 → bytes)
      { pathname: "/api/ri/**" }, // cached review-image route
      { pathname: "/catalog/**" }, // static product photos (scripts/catalog pipeline)
      { pathname: "/logo.png" },
      { pathname: "/logos/**" },
      { pathname: "/messi-worldcup.jpg" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "photo.yupoo.com" },
      { protocol: "https", hostname: "**.yupoo.com" },
      { protocol: "https", hostname: "essportswr.com" },
      { protocol: "https", hostname: "**.essportswr.com" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "pulsesfootball.com" },
      { protocol: "https", hostname: "vamos-kw.com" },
      { protocol: "https", hostname: "**.vamos-kw.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Catalog photos are content-hashed (<n>-<hash>.webp), so they never change
  // at a given URL — cache them for a year on the CDN and in browsers.
  async headers() {
    return [
      {
        source: "/catalog/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
