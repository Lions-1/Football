import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";
import { LEAGUE_LOGOS, NATIONAL_TEAM_CRESTS, COUNTRY_FLAGS, CLUB_LOGOS, CHAMPIONS_LEAGUE_CLUBS } from "@/lib/leagues-data";
import HomeProducts from "@/components/HomeProducts";
import StaggerGrid from "@/components/StaggerGrid";
import { parseProductImages } from "@/lib/product-images";

export const dynamic = "force-dynamic";

// F1 teams — used in the homepage F1 marquee
const F1_TEAMS = [
  { name: "Red Bull Racing", slug: "red-bull-racing", color: "#1E41FF", short: "RBR" },
  { name: "Ferrari",         slug: "ferrari",          color: "#DC0000", short: "FER" },
  { name: "Mercedes",        slug: "mercedes-amg-f1",  color: "#00D2BE", short: "MER" },
  { name: "McLaren",         slug: "mclaren-f1",       color: "#FF8000", short: "MCL" },
  { name: "Alpine",          slug: "alpine-f1",        color: "#0090FF", short: "ALP" },
  { name: "Aston Martin",    slug: "aston-martin-f1",  color: "#006F62", short: "AMF" },
  { name: "Williams",        slug: "williams-f1",      color: "#005AFF", short: "WIL" },
  { name: "RB",              slug: "rb-f1",            color: "#6692FF", short: "RB"  },
  { name: "Kick Sauber",     slug: "kick-sauber",      color: "#52E252", short: "KS"  },
  { name: "Haas",            slug: "haas-f1",          color: "#B6BABD", short: "HAA" },
];

// Hero jersey showcase — picked from our DB to highlight 4 best 2026/27 home jerseys.
// Using the first inside-album photo (typically front-facing) instead of the cover.
// Images are served via /api/img/* proxy which sets the Referer header Yupoo requires.
const HERO_JERSEYS = [
  { team: "Real Madrid",       img: "/api/img/wanfing/f7037446/cc486d82.jpg", color: "from-white/20 to-white/0" },
  { team: "FC Barcelona",      img: "/api/img/wanfing/ae617188/9f3f226c.jpg", color: "from-blue-500/20 to-red-500/0" },
  { team: "Manchester United", img: "/api/img/wanfing/0666372a/83e6077f.jpg", color: "from-red-500/20 to-red-500/0" },
  { team: "Brazil",            img: "/api/img/wanfing/67a1957f/4ab26320.jpg", color: "from-yellow-400/20 to-green-500/0" },
];

// NBA jersey showcase — 4 Luka Doncic Lakers jerseys (different colorways / eras)
const HERO_NBA_JERSEYS = [
  { label: "Lakers",   img: "/api/img/wanfing/cf04f346/2ff27564.jpg", color: "from-purple-500/25 to-yellow-400/0" },
  { label: "Lakers",   img: "/api/img/wanfing/8937007d/74725bbe.jpg", color: "from-yellow-400/25 to-purple-500/0" },
  { label: "Mavericks", img: "/api/img/wanfing/aab3f218/5c59c2b4.jpg", color: "from-blue-500/25 to-white/0" },
  { label: "Classic",  img: "/api/img/wanfing/59f9bd46/530180ac.jpg", color: "from-red-500/25 to-blue-500/0" },
];

async function getHomeData() {
  const [leagues, productCount, teamCount, wcProducts, moroccoProducts, uclProducts, nbaProducts, f1Products] = await Promise.all([
    prisma.league.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { teams: true } } },
    }),
    prisma.product.count(),
    prisma.team.count(),
    // WC2026 products — one real jersey per country (any real http image)
    prisma.product.findMany({
      where: {
        team: { league: { slug: "national-teams" } },
        images: { contains: "https://" },
        NOT: [
          { name: { contains: "Kids" } },
          { name: { contains: "Women" } },
          { name: { contains: "Long Sleeve" } },
          { name: { contains: "GK" } },
          { name: { contains: "Retro" } },
          { name: { contains: "Air Freshener" } },
          { name: { contains: "Lanyard" } },
          { name: { contains: "Pin" } },
        ],
      },
      distinct: ["teamId"],
      include: { team: true },
      orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    // Morocco products
    prisma.product.findMany({
      where: {
        team: { slug: "morocco" },
      },
      include: { team: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // UCL club products — one per team via distinct
    prisma.product.findMany({
      where: {
        team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } },
        images: { not: "[]" },
        NOT: [
          { name: { contains: "Kids" } },
          { name: { contains: "Women" } },
          { name: { contains: "Long Sleeve" } },
          { name: { contains: "GK" } },
        ],
      },
      distinct: ["teamId"],
      include: { team: true },
      orderBy: { bestSeller: "desc" },
      take: 6,
    }),
    // NBA jerseys — newly seeded league
    prisma.product.findMany({
      where: {
        team: { league: { slug: "nba" } },
        images: { contains: "https://" },
      },
      include: { team: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // F1 racing wear — jackets / suits / hoodies for all 10 teams
    prisma.product.findMany({
      where: {
        team: { league: { slug: "f1" } },
        images: { contains: "https://" },
      },
      include: { team: true },
      orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  return { leagues, productCount, teamCount, wcProducts, moroccoProducts, uclProducts, nbaProducts, f1Products };
}

export default async function Home() {
  const { leagues, productCount, teamCount, wcProducts, moroccoProducts, uclProducts, nbaProducts, f1Products } = await getHomeData();

  return (
    <div>
      {/* ═══ HERO — dark stadium photo + gradient overlays + jersey showcase ═══ */}
      <section className="hero-section relative overflow-hidden min-h-[560px] md:min-h-[640px] flex items-center bg-[#0a0a14]">
        {/* Atmospheric stadium background image */}
        <Image
          src="https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1800&q=85"
          alt=""
          aria-hidden
          fill
          priority
          unoptimized
          className="object-cover opacity-50"
          sizes="100vw"
        />
        {/* Dark gradient overlays so text + jersey cards stay legible */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a14]/85 via-[#0d1224]/75 to-[#1a0d24]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-[#0a0a14]/40" />

        {/* Animated radial gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-purple-500/15 rounded-full blur-[100px]" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: copy */}
          <div>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight text-white uppercase">
              Wear the
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 bg-clip-text text-transparent">Beautiful Game</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/65 max-w-lg leading-relaxed">
              {productCount}+ authentic jerseys from every major league worldwide — Premier League, La Liga, Serie A, Bundesliga, Brasileirão, NBA, F1 and more.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-6 py-3.5 rounded-xl transition shadow-lg shadow-orange-500/25"
              >
                Shop the Collection <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/league/national-teams"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:border-orange-400 text-white px-6 py-3.5 rounded-xl transition"
              >
                World Cup 2026
              </Link>
              <a
                href="https://wa.me/21261614253"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white text-white font-bold px-6 py-3.5 rounded-xl transition"
              >
                Order on WhatsApp
              </a>
            </div>
          </div>

          {/* Right: 4-jersey rotating showcase */}
          <div className="hidden lg:block relative h-[480px]">
            {HERO_JERSEYS.map((j, i) => {
              const positions = [
                "top-0 left-8 rotate-[-8deg]",
                "top-12 right-0 rotate-[6deg]",
                "bottom-12 left-0 rotate-[5deg]",
                "bottom-0 right-12 rotate-[-4deg]",
              ];
              return (
                <div
                  key={j.team}
                  className={`absolute w-56 h-72 rounded-2xl overflow-hidden border border-white/15 shadow-2xl ${positions[i]} hover:scale-105 hover:rotate-0 transition-all duration-500`}
                  style={{ zIndex: 10 - i }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${j.color} z-10 mix-blend-overlay`} />
                  <Image
                    src={j.img}
                    alt={j.team}
                    fill
                    className="object-cover"
                    sizes="224px"
                    unoptimized
                    priority={i < 2}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 z-20">
                    <p className="text-white text-xs font-semibold tracking-wide">{j.team}</p>
                    <p className="text-orange-400 text-[10px] font-bold uppercase">2026/27 Home</p>
                  </div>
                </div>
              );
            })}
            {/* Floating accent badge */}
            <div className="absolute -top-4 right-1/2 translate-x-1/2 lg:top-1/2 lg:right-auto lg:left-1/2 lg:-translate-y-1/2 lg:-translate-x-1/2 z-30 pointer-events-none">
              <div className="text-[140px] font-heading font-black text-white/[0.03] uppercase leading-none whitespace-nowrap select-none">
                26/27
              </div>
            </div>
          </div>

          {/* Mobile: simpler 2×2 jersey grid */}
          <div className="lg:hidden grid grid-cols-2 gap-3">
            {HERO_JERSEYS.map((j) => (
              <div
                key={j.team}
                className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/15 shadow-xl"
              >
                <Image
                  src={j.img}
                  alt={j.team}
                  fill
                  className="object-cover"
                  sizes="50vw"
                  unoptimized
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-2">
                  <p className="text-white text-[11px] font-semibold">{j.team}</p>
                  <p className="text-orange-400 text-[9px] font-bold uppercase">26/27</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 md:divide-x divide-gray-200">
          {([
            { value: `${productCount}+`, label: "Products" },
            { value: `${leagues.length}`, label: "Leagues" },
            { value: `${teamCount}+`, label: "Teams" },
            { value: "24 / 7", label: "WhatsApp Support" },
          ] as { value: string; label: string }[]).map((stat, i) => (
            <div key={i} className={`flex flex-col items-center justify-center py-7 px-4 gap-0 ${i % 2 !== 0 ? "border-l border-gray-200 md:border-l-0" : ""} ${i < 2 ? "border-b border-gray-200 md:border-b-0" : ""}`}>
              <span className="block w-6 h-[2px] bg-orange-500 mb-3" />
              <span className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight tabular-nums leading-none">
                {stat.value}
              </span>
              <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ WORLD CUP 2026 — Immersive ═══════════ */}
      <section className="relative w-full overflow-hidden">
        {/* Full-width background image */}
        <div className="relative w-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px]">
          <Image
            src="/wc2026-hero.png"
            alt="FIFA World Cup 2026"
            fill
            className="object-cover"
            sizes="100vw"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

          {/* Text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
            <h2 className="font-heading text-6xl sm:text-8xl md:text-[130px] lg:text-[160px] font-bold tracking-tight leading-[0.85] uppercase text-white text-center drop-shadow-lg">
              World Cup <span className="text-orange-500">2026</span>
            </h2>
            <p className="mt-4 text-white/80 text-sm sm:text-base max-w-md text-center">
              Official replica jerseys for the FIFA World Cup 2026. Pre-order now.
            </p>
            <Link
              href="/league/national-teams"
              className="mt-6 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-lg transition text-sm"
            >
              SHOP WORLD CUP <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Marquee roulette floating at the bottom of the image */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-4 pt-6 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex animate-marquee items-center gap-8 w-max">
              {[...COUNTRY_FLAGS, ...COUNTRY_FLAGS].map((country, i) => (
                <Link
                  key={`${country.slug}-${i}`}
                  href={`/team/${country.slug}`}
                  className="flex-shrink-0 group flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 group-hover:border-orange-400 flex items-center justify-center transition overflow-hidden relative">
                    <Image
                      src={NATIONAL_TEAM_CRESTS[country.slug] || `https://flagcdn.com/w80/${country.code}.png`}
                      alt={country.name}
                      fill
                      className="object-contain p-1.5 group-hover:scale-110 transition-transform"
                      sizes="56px"
                      unoptimized
                    />
                  </div>
                  <span className="text-[9px] text-white/70 group-hover:text-orange-400 transition font-medium text-center w-14 truncate">
                    {country.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* WC2026 Jersey Product Grid — below the image */}
        {wcProducts.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 py-14">
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" delay={65}>
              {wcProducts.map((product) => {
                const images = parseProductImages(product.images);
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group block stagger-item"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group-hover:border-orange-400 transition relative">
                      {images[0] && (
                        <Image
                          src={images[0]}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          unoptimized
                        />
                      )}
                      {product.surCommande && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Pre-order
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 px-0.5">
                      <p className="text-xs text-gray-400 font-medium truncate">{product.team.name}</p>
                      <p className="text-sm text-gray-900 font-semibold truncate mt-0.5 group-hover:text-orange-500 transition">
                        {product.name.replace(/World Cup 2026|2026|Fan Jersey Shirt|Fan Version|- /g, "").replace(/\s+/g, " ").trim()}
                      </p>
                      <p className="text-sm text-orange-500 font-bold mt-1">${product.price}</p>
                    </div>
                  </Link>
                );
              })}
            </StaggerGrid>
            <div className="mt-8 text-center">
              <Link
                href="/league/national-teams"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-lg transition text-sm"
              >
                SEE ALL WORLD CUP JERSEYS <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════ MOROCCO WC 2026 — In Stock ═══════════ */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8">
          <p className="font-heading text-2xl font-bold text-green-500 uppercase tracking-tight mb-1">In Stock</p>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-3xl font-bold text-gray-900 tracking-tight uppercase flex items-center gap-3">
              <img src="https://flagcdn.com/w40/ma.png" alt="Morocco" className="w-9 h-6 object-cover rounded-sm shadow-sm" />
              Morocco WC 2026
            </h2>
            <Link href="/team/morocco" className="text-sm text-orange-500 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {moroccoProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">��🇦</span>
                <span className="text-[10px] text-gray-400 font-medium">Coming soon</span>
              </div>
            ))}
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" delay={65}>
            {moroccoProducts.map((product) => {
              const imgs = parseProductImages(product.images);
              return (
                <Link key={product.id} href={`/product/${product.slug}`} className="group block stagger-item">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group-hover:border-green-400 transition relative">
                    {imgs[0] ? (
                      <img
                        src={imgs[0]}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl">��🇦</span>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      IN STOCK
                    </span>
                  </div>
                  <div className="mt-2.5 px-0.5">
                    <p className="text-xs text-gray-400 font-medium truncate">{product.team.name}</p>
                    <p className="text-sm text-gray-900 font-semibold truncate mt-0.5 group-hover:text-orange-500 transition">
                      {product.name.replace(/World Cup 2026|2026|Fan Jersey Shirt|Fan Version|- /g, "").replace(/\s+/g, " ").trim()}
                    </p>
                    <p className="text-sm text-orange-500 font-bold mt-1">${product.price}</p>
                  </div>
                </Link>
              );
            })}
          </StaggerGrid>
        )}
      </section>

      {/* ═══════════ CHAMPIONS LEAGUE ═══════════ */}
      <section className="relative w-full overflow-hidden bg-[#0a0f2e]">
        <div className="relative w-full min-h-[320px] sm:min-h-[420px] md:min-h-[500px]">
          <Image
            src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&q=85"
            alt="UEFA Champions League"
            fill
            className="object-cover opacity-40"
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f2e]/60 via-[#0a0f2e]/30 to-[#0a0f2e]/80" />
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
            <h2 className="font-heading text-5xl sm:text-7xl md:text-[110px] font-bold tracking-tight leading-[0.85] uppercase text-white text-center drop-shadow-lg">
              Champions <span className="text-[#c8a84b]">League</span>
            </h2>
            <p className="mt-4 text-white/70 text-sm sm:text-base max-w-md text-center">
              Top European club jerseys — Real Madrid, Barcelona, Bayern, PSG & more.
            </p>
            <Link
              href="/league/champions-league"
              className="mt-6 inline-flex items-center gap-2 bg-[#c8a84b] hover:bg-[#b8943b] text-black font-bold px-8 py-3 rounded-lg transition text-sm"
            >
              SHOP UCL JERSEYS <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {uclProducts.length > 0 && (
          <div className="bg-[#0a0f2e] mx-auto max-w-7xl px-4 py-12">
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" delay={65}>
              {uclProducts.map((product) => {
                const imgs = parseProductImages(product.images);
                return (
                  <Link key={product.id} href={`/product/${product.slug}`} className="group block stagger-item">
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-[#c8a84b] transition relative">
                      {imgs[0] && (
                        <img src={imgs[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                    </div>
                    <div className="mt-2.5 px-0.5">
                      <p className="text-xs text-white/40 font-medium truncate">{product.team.name}</p>
                      <p className="text-sm text-white font-semibold truncate mt-0.5 group-hover:text-[#c8a84b] transition">
                        {product.name.replace(/2026|2025|Fan Jersey Shirt|Fan Version|Home Kit|- /g, "").replace(/\s+/g, " ").trim()}
                      </p>
                      <p className="text-sm text-[#c8a84b] font-bold mt-1">${product.price}</p>
                    </div>
                  </Link>
                );
              })}
            </StaggerGrid>
            <div className="mt-8 text-center">
              <Link href="/league/champions-league" className="inline-flex items-center gap-2 bg-[#c8a84b] hover:bg-[#b8943b] text-black font-bold px-8 py-3 rounded-lg transition text-sm">
                SEE ALL UCL JERSEYS <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ═══ F1 — racing wear with Ferrari red / silver vibe ═══ */}
      <section className="relative w-full overflow-hidden bg-[#0e0e0e]">
        <div className="relative w-full min-h-[320px] sm:min-h-[420px] md:min-h-[500px]">
          <Image
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85"
            alt="Formula 1"
            fill
            className="object-cover opacity-50"
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/85" />
          {/* Diagonal red accent stripe */}
          <div className="absolute -bottom-20 -right-20 w-[600px] h-32 bg-gradient-to-r from-transparent via-red-600/40 to-transparent rotate-[-12deg] blur-2xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 pb-28 sm:pb-32">
            <div className="inline-flex items-center gap-2 bg-red-600/15 backdrop-blur-sm border border-red-600/40 rounded-full px-4 py-1.5 text-xs text-red-300 font-bold uppercase tracking-wider mb-4">
              Lights Out
            </div>
            <h2 className="font-heading text-6xl sm:text-8xl md:text-[130px] font-bold tracking-tight leading-[0.85] uppercase text-white text-center drop-shadow-lg">
              Formula <span className="text-red-500">1</span>
            </h2>
            <p className="mt-4 text-white/70 text-sm sm:text-base max-w-md text-center">
              Official team racing suits, jackets & fan wear for all 10 F1 teams. 2025 season.
            </p>
            <Link
              href="/league/f1"
              className="mt-6 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-lg transition text-sm shadow-lg shadow-red-600/30"
            >
              SHOP F1 GEAR <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {/* F1 teams marquee */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-4 pt-6 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex animate-marquee items-center gap-6 w-max">
              {[...F1_TEAMS, ...F1_TEAMS, ...F1_TEAMS, ...F1_TEAMS].map((team, i) => (
                <Link
                  key={`${team.slug}-${i}`}
                  href={`/team/${team.slug}`}
                  className="flex-shrink-0 group flex flex-col items-center gap-1.5"
                >
                  <div className="w-28 sm:w-32 h-14 sm:h-16 rounded-lg bg-white/95 group-hover:bg-white flex items-center justify-center transition shadow-md border border-white/20 group-hover:border-red-400 px-3 py-2">
                    {CLUB_LOGOS[team.slug] ? (
                      <img
                        src={CLUB_LOGOS[team.slug]}
                        alt={team.name}
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="font-black text-sm" style={{ color: team.color }}>{team.short}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-white/70 group-hover:text-red-400 transition font-medium text-center truncate max-w-[8rem]">
                    {team.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        {/* F1 product grid */}
        {f1Products.length > 0 && (
          <div className="bg-[#0e0e0e] mx-auto max-w-7xl px-4 py-12">
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" delay={65}>
              {f1Products.map((product) => {
                const imgs = parseProductImages(product.images);
                return (
                  <Link key={product.id} href={`/product/${product.slug}`} className="group block stagger-item">
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-red-500 transition relative">
                      {imgs[0] && (
                        <img src={imgs[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                    </div>
                    <div className="mt-2.5 px-0.5">
                      <p className="text-xs text-white/40 font-medium truncate">{product.team.name}</p>
                      <p className="text-sm text-white font-semibold truncate mt-0.5 group-hover:text-red-400 transition">
                        {product.name.replace(/\s+/g, " ").trim()}
                      </p>
                      <p className="text-sm text-red-400 font-bold mt-1">${product.price}</p>
                    </div>
                  </Link>
                );
              })}
            </StaggerGrid>
            <div className="mt-8 text-center">
              <Link href="/league/f1" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-lg transition text-sm">
                SEE ALL F1 GEAR <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ═══ NBA — jersey showcase with Lakers purple/gold vibe ═══ */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#0a0612] via-[#1a0a2e] to-[#2d1a0a] min-h-[560px] md:min-h-[640px] flex items-center">
        {/* Animated orbs — Lakers purple + NBA red */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#552583]/50 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 left-0 w-[500px] h-[500px] bg-[#c9082a]/25 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: "1.2s" }} />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-[#fdb927]/15 rounded-full blur-[100px]" />

        {/* Faint grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: copy */}
          <div>
            <h2 className="font-heading text-6xl sm:text-7xl md:text-[110px] font-black leading-[0.9] tracking-tight uppercase text-white">
              <span className="text-[#c9082a]">N</span>B<span className="text-[#1d428a]">A</span>
              <br />
              <span className="bg-gradient-to-r from-[#fdb927] via-[#552583] to-[#c9082a] bg-clip-text text-transparent text-4xl md:text-5xl block mt-2">
                Luka Doncic Collection
              </span>
            </h2>
            <p className="mt-5 text-base md:text-lg text-white/65 max-w-lg leading-relaxed">
              Authentic NBA jerseys featuring Luka Doncic in Lakers purple and gold, plus Dallas Mavericks throwbacks and classic editions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/league/nba"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#c9082a] to-[#a30622] hover:from-[#d91236] hover:to-[#b90728] text-white font-bold px-6 py-3.5 rounded-xl transition shadow-lg shadow-[#c9082a]/25"
              >
                Shop NBA Jerseys <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/team/los-angeles-lakers"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:border-[#fdb927] text-white px-6 py-3.5 rounded-xl transition"
              >
                Lakers Collection
              </Link>
            </div>
          </div>

          {/* Right: 4-jersey rotating showcase (desktop) */}
          <div className="hidden lg:block relative h-[480px]">
            {HERO_NBA_JERSEYS.map((j, i) => {
              const positions = [
                "top-0 left-8 rotate-[-8deg]",
                "top-12 right-0 rotate-[6deg]",
                "bottom-12 left-0 rotate-[5deg]",
                "bottom-0 right-12 rotate-[-4deg]",
              ];
              return (
                <div
                  key={`${j.label}-${i}`}
                  className={`absolute w-56 h-72 rounded-2xl overflow-hidden border border-white/15 shadow-2xl ${positions[i]} hover:scale-105 hover:rotate-0 transition-all duration-500`}
                  style={{ zIndex: 10 - i }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${j.color} z-10 mix-blend-overlay`} />
                  <Image
                    src={j.img}
                    alt={`Luka Doncic ${j.label}`}
                    fill
                    className="object-cover"
                    sizes="224px"
                    unoptimized
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 z-20">
                    <p className="text-white text-xs font-semibold tracking-wide">Luka Doncic</p>
                    <p className="text-[#fdb927] text-[10px] font-bold uppercase">{j.label}</p>
                  </div>
                </div>
              );
            })}
            {/* Floating accent badge */}
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 z-0 pointer-events-none">
              <div className="text-[140px] font-heading font-black text-white/[0.03] uppercase leading-none select-none">
                77
              </div>
            </div>
          </div>

          {/* Mobile: 2×2 jersey grid */}
          <div className="lg:hidden grid grid-cols-2 gap-3">
            {HERO_NBA_JERSEYS.map((j, i) => (
              <div
                key={`m-${j.label}-${i}`}
                className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/15 shadow-xl"
              >
                <Image
                  src={j.img}
                  alt={`Luka Doncic ${j.label}`}
                  fill
                  className="object-cover"
                  sizes="50vw"
                  unoptimized
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-2">
                  <p className="text-white text-[11px] font-semibold">Luka Doncic</p>
                  <p className="text-[#fdb927] text-[9px] font-bold uppercase">{j.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by League — Top 5 only, bigger icons */}
      {leagues.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-3xl font-bold text-gray-900 tracking-tight uppercase">Browse by League</h2>
          </div>
          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5" delay={80}>
            {leagues.filter(l => l.slug !== "national-teams").slice(0, 5).map((league) => (
              <Link
                key={league.id}
                href={`/league/${league.slug}`}
                className="group bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-2xl p-6 text-center transition-all shadow-sm hover:shadow-lg stagger-item"
              >
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  {LEAGUE_LOGOS[league.slug] ? (
                    <Image
                      src={LEAGUE_LOGOS[league.slug]}
                      alt={league.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-300"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-black text-xl">
                      {league.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900">{league.name}</p>
              </Link>
            ))}
          </StaggerGrid>
          <div className="mt-8 text-center">
            <Link
              href="/leagues"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-lg transition text-sm"
            >
              VIEW ALL LEAGUES <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Product sections (New Arrivals / Featured / Best Sellers) */}
      <HomeProducts />
    </div>
  );
}
