import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";
import { LEAGUE_LOGOS, NATIONAL_TEAM_CRESTS, COUNTRY_FLAGS } from "@/lib/leagues-data";
import HomeProducts from "@/components/HomeProducts";
import StaggerGrid from "@/components/StaggerGrid";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const [leagues, productCount, teamCount, wcProducts, moroccoProducts] = await Promise.all([
    prisma.league.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { teams: true } } },
    }),
    prisma.product.count(),
    prisma.team.count(),
    // WC2026 products with real jersey images (Shopify CDN)
    prisma.product.findMany({
      where: {
        team: { league: { slug: "national-teams" } },
        images: { not: "[]" },
        name: { contains: "Fan" },
        NOT: [
          { name: { contains: "Kids" } },
          { name: { contains: "Women" } },
          { name: { contains: "Long Sleeve" } },
          { name: { contains: "Away" } },
          { name: { contains: "GK" } },
        ],
      },
      include: { team: true },
      orderBy: { createdAt: "desc" },
      take: 6,
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
  ]);

  return { leagues, productCount, teamCount, wcProducts, moroccoProducts };
}

export default async function Home() {
  const { leagues, productCount, teamCount, wcProducts, moroccoProducts } = await getHomeData();

  return (
    <div>
      {/* Hero with grass field / stadium */}
      <section className="hero-section relative overflow-hidden min-h-[420px] md:min-h-[560px] flex items-center">
        <Image
          src="https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1400&q=85"
          alt=""
          fill
          className="object-cover hero-img"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/25" />

        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24 relative z-10 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-orange-500 rounded-full px-4 py-1.5 text-sm text-white font-semibold mb-6">
              New Season 2025/26 Available
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight tracking-tight text-white uppercase">
              Premium Football
              <br />
              <span className="text-orange-400">Jerseys & Kits</span>
            </h1>
            <p className="mt-4 text-lg text-white/70 max-w-lg">
              Discover the latest football jerseys from top leagues worldwide. Player versions, retro classics, and custom orders available.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition"
              >
                Browse All Products <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/league/national-teams"
                className="inline-flex items-center gap-2 border border-white/30 hover:border-orange-400 text-white px-6 py-3 rounded-lg transition"
              >
                World Cup 2026
              </Link>
              <a
                href="https://wa.me/21261614253"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/30 hover:border-white text-white font-bold px-6 py-3 rounded-lg transition"
              >
                Order Now
              </a>
            </div>
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
                const images = JSON.parse(product.images) as string[];
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

      {/* ═══════════ MOROCCO WC 2026 — Available Now ═══════════ */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8">
          <p className="font-heading text-2xl font-bold text-green-500 uppercase tracking-tight mb-1">Available Now</p>
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
                <span className="text-3xl">🇲🇦</span>
                <span className="text-[10px] text-gray-400 font-medium">Coming soon</span>
              </div>
            ))}
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" delay={65}>
            {moroccoProducts.map((product) => {
              const imgs = JSON.parse(product.images) as string[];
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
                        <span className="text-5xl">🇲🇦</span>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      AVAILABLE
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

      {/* Mebutik Sports branding banner */}
      <section className="w-full bg-gray-900 overflow-hidden">
        <Image
          src="/hero-brand.png"
          alt="Mebutik Sports — Premium Football Jerseys"
          width={1400}
          height={400}
          className="w-full h-auto scale-[1.4] sm:scale-[1.15] md:scale-100 origin-center"
          sizes="100vw"
        />
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
              href="/products"
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
