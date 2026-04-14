import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    localPatterns: [
      { pathname: "/api/img/**" },
      { pathname: "/logo.png" },
      { pathname: "/logos/**" },
      { pathname: "/wc2026-hero.png" },
      { pathname: "/messi-worldcup.jpg" },
      { pathname: "/hero-brand.png" },
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
};

export default nextConfig;
