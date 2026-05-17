import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Truck, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { MAIN_NAV_BUCKETS, PREMIER_LEAGUE_MARQUEE, CLUB_LOGOS } from "@/lib/leagues-data";
import HomeProducts from "@/components/HomeProducts";
import StaggerGrid from "@/components/StaggerGrid";
import { parseProductImages } from "@/lib/product-images";

export const dynamic = "force-dynamic";

/**
 * Colour palette for each Shop-by-Bucket tile. Keys mirror the `tone` field
 * on MAIN_NAV_BUCKETS in `src/lib/leagues-data.ts`.
 */
const TILE_THEMES: Record<string, { bg: string; accent: string; border: string }> = {
  purple:  { bg: "from-[#360b4a] via-[#4a0e6e] to-[#1a0433]", accent: "text-purple-200",  border: "hover:border-purple-400" },
  red:     { bg: "from-[#6e0a1f] via-[#a0112d] to-[#3c0413]", accent: "text-red-200",     border: "hover:border-red-400"    },
  blue:    { bg: "from-[#0a2c6e] via-[#112c7a] to-[#04123c]", accent: "text-blue-200",    border: "hover:border-blue-400"   },
  rose:    { bg: "from-[#6e0a2f] via-[#a51341] to-[#3c0417]", accent: "text-rose-200",    border: "hover:border-rose-400"   },
  navy:    { bg: "from-[#081a3a] via-[#0f2a5a] to-[#030b1d]", accent: "text-sky-200",     border: "hover:border-sky-400"    },
  gold:    { bg: "from-[#3a2b0a] via-[#6e4f11] to-[#1f1604]", accent: "text-amber-200",   border: "hover:border-[#c8a84b]"  },
  green:   { bg: "from-[#0a5a2f] via-[#107a3f] to-[#042a17]", accent: "text-emerald-200", border: "hover:border-emerald-400"},
  teal:    { bg: "from-[#0a3d5a] via-[#0e5a7a] to-[#042a3c]", accent: "text-teal-200",    border: "hover:border-teal-400"   },
  vintage: { bg: "from-[#3a2414] via-[#5a3a20] to-[#1a0f08]", accent: "text-amber-100",   border: "hover:border-amber-300"  },
  slate:   { bg: "from-[#1e293b] via-[#334155] to-[#0f172a]", accent: "text-slate-200",   border: "hover:border-slate-400"  },
};

async function getHomeData() {
  const [productCount, teamCount, leagueCount, retroProducts, preorderProducts] = await Promise.all([
    prisma.product.count(),
    prisma.team.count(),
    prisma.league.count({ where: { slug: { not: "national-teams" } } }),
    // Retro picks — only shown if at least one exists
    prisma.product.findMany({
      where: { category: "retro" },
      include: { team: true },
      orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    // Pre-order strip — only shown if at least one exists
    prisma.product.findMany({
      where: { surCommande: true },
      include: { team: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  return { productCount, teamCount, leagueCount, retroProducts, preorderProducts };
}

export default async function Home() {
  const { productCount, teamCount, leagueCount, retroProducts, preorderProducts } = await getHomeData();

  return (
    <div>
      {/* ═══ HERO — dark stadium + bold typography ═══ */}
      <section className="hero-section relative overflow-hidden min-h-[520px] md:min-h-[580px] flex items-center bg-[#0a0a14]">
        <Image
          src="https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1800&q=85"
          alt=""
          aria-hidden
          fill
          priority
          unoptimized
          className="object-cover opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a14]/90 via-[#0d1224]/75 to-[#1a0d24]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-[#0a0a14]/50" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/25 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 right-0 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20 relative z-10 w-full">
          <div className="max-w-3xl">
            <p className="text-orange-400 text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase mb-5">
              Matchday Kits · Retro Classics · Pre-Order
            </p>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.92] tracking-tight text-white uppercase">
              Wear the
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 bg-clip-text text-transparent">
                Beautiful Game
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-white/70 max-w-xl leading-relaxed">
              Authentic jerseys from Europe's top 5 leagues, the Champions League, Morocco's national team, and vintage classics — handpicked, in stock, and shipped across Morocco.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-6 py-3.5 rounded-xl transition shadow-lg shadow-orange-500/25"
              >
                Shop the Collection <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/212628552405"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white text-white font-bold px-6 py-3.5 rounded-xl transition"
              >
                Order on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Stats strip ═══ */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 md:divide-x divide-gray-200">
          {([
            { value: productCount > 0 ? `${productCount}+` : "Fresh", label: "Stock" },
            { value: `${leagueCount}`,                                 label: "Leagues" },
            { value: teamCount > 0 ? `${teamCount}+` : "Curated",     label: "Teams" },
            { value: "24 / 7",                                         label: "WhatsApp Support" },
          ] as { value: string; label: string }[]).map((stat, i) => (
            <div
              key={i}
              className={`flex flex-col items-center justify-center py-7 px-4 gap-0 ${i % 2 !== 0 ? "border-l border-gray-200 md:border-l-0" : ""} ${i < 2 ? "border-b border-gray-200 md:border-b-0" : ""}`}
            >
              <span className="block w-6 h-[2px] bg-orange-500 mb-3" />
              <span className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight tabular-nums leading-none">
                {stat.value}
              </span>
              <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ MOROCCO SHOWCASE — Atlas Lions tribute ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c1272d] via-[#9e1f2c] to-[#0a3d2a]" />
        <Image
          src="https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1800&q=85"
          alt=""
          aria-hidden
          fill
          unoptimized
          className="object-cover opacity-30 mix-blend-overlay"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30" />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 22px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 22px)",
          }}
        />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-[#f6c700]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] bg-[#0a3d2a]/40 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="order-2 md:order-1">
            <p className="inline-flex items-center gap-2 text-[#f6c700] text-xs font-bold tracking-[0.3em] uppercase mb-4">
              <Star className="w-3.5 h-3.5 fill-[#f6c700]" />
              Morocco · Atlas Lions
              <Star className="w-3.5 h-3.5 fill-[#f6c700]" />
            </p>
            <h2 className="font-heading text-5xl sm:text-6xl md:text-6xl lg:text-7xl font-black uppercase text-white leading-[0.92] tracking-tight">
              Wear the
              <br />
              <span className="italic font-serif font-normal text-[#f6c700]">pride</span>
              <br />
              of a nation.
            </h2>
            <p className="mt-6 text-base md:text-lg text-white/80 max-w-md leading-relaxed">
              Home, away, and player-version kits of the Atlas Lions — the team that lit up Qatar 2022 and made history for an entire continent.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/team/morocco"
                className="inline-flex items-center gap-2 bg-white text-[#c1272d] hover:bg-amber-100 font-bold px-6 py-3.5 rounded-xl transition shadow-xl"
              >
                Shop Morocco kits <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/212628552405?text=Hi!%20I'm%20looking%20for%20Morocco%20kits."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white text-white font-bold px-6 py-3.5 rounded-xl transition"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp us
              </a>
            </div>
          </div>

          <div className="order-1 md:order-2 relative aspect-square max-w-[280px] sm:max-w-sm md:max-w-md mx-auto w-full">
            <div className="absolute inset-8 bg-[#f6c700]/30 blur-[80px] rounded-full" />
            <div className="absolute inset-0 border-2 border-white/15 rounded-full animate-pulse" style={{ animationDuration: "3s" }} />
            <div className="absolute inset-6 border border-white/10 rounded-full" />
            <Image
              src="/logos/national-teams/morocco.png"
              alt="Morocco crest"
              fill
              unoptimized
              className="object-contain drop-shadow-2xl relative z-10 p-10"
              sizes="(max-width: 768px) 280px, 480px"
            />
          </div>
        </div>
      </section>

      {/* ═══ SHOP BY BUCKET — the 8-tile grid, the centerpiece of the homepage ═══ */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <p className="text-orange-500 text-xs font-bold tracking-[0.3em] uppercase mb-2">Choose Your Side</p>
          <h2 className="font-heading text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase">
            Shop by League
          </h2>
          <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
            Top leagues, national teams, retro classics, and more — tap any tile to dive in.
          </p>
        </div>

        <StaggerGrid className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4" delay={60}>
          {MAIN_NAV_BUCKETS.map((bucket) => {
            const theme = TILE_THEMES[bucket.tone] || TILE_THEMES.navy;
            return (
              <Link
                key={bucket.slug}
                href={bucket.href}
                className={`group relative stagger-item aspect-square rounded-2xl overflow-hidden border-2 border-white/5 ${theme.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`} />
                {/* Subtle grid overlay */}
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                    backgroundSize: "30px 30px",
                  }}
                />
                {/* Radial glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500" />

                {/* Logo / visual */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 sm:p-6">
                  {bucket.logo ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-500">
                      <Image
                        src={bucket.logo}
                        alt={bucket.name}
                        fill
                        className="object-contain drop-shadow-2xl"
                        sizes="96px"
                        unoptimized
                      />
                    </div>
                  ) : bucket.slug === "retro" ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-3 sm:mb-4 flex items-center justify-center border-2 border-amber-200/30 rounded-full group-hover:scale-110 transition-transform duration-500">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-amber-100">R</span>
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-3 sm:mb-4 flex items-center justify-center border-2 border-slate-300/30 rounded-full group-hover:scale-110 transition-transform duration-500">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100">+</span>
                    </div>
                  )}
                  <p className={`text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase ${theme.accent} mb-1`}>
                    {bucket.slug === "retro" ? "Vintage Classics" : bucket.slug === "others" ? "All Products" : "Explore"}
                  </p>
                  <p className="text-base sm:text-lg md:text-xl font-black text-white text-center leading-tight">
                    {bucket.name}
                  </p>
                  <ArrowRight className="w-4 h-4 text-white/40 mt-2 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </StaggerGrid>
      </section>

      {/* ═══ PREMIER LEAGUE ROULETTE — auto-scrolling crest marquee ═══ */}
      <section className="relative bg-gradient-to-br from-[#1a0533] via-[#360b4a] to-[#1a0533] py-12 overflow-hidden border-y border-purple-900/40">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-purple-300 text-xs font-bold tracking-[0.3em] uppercase mb-1.5">
              All 20 Clubs · The Best League in the World
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              Premier League <span className="text-purple-300 italic font-serif font-normal">Roulette</span>
            </h2>
          </div>
          <Link
            href="/league/premier-league"
            className="inline-flex items-center gap-2 bg-white text-[#360b4a] hover:bg-purple-100 font-bold px-5 py-2.5 rounded-lg transition text-sm shadow-lg"
          >
            Browse all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#1a0533] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#1a0533] to-transparent z-10 pointer-events-none" />
          <div className="flex animate-marquee w-max items-center gap-3 sm:gap-5 px-6">
            {[...PREMIER_LEAGUE_MARQUEE, ...PREMIER_LEAGUE_MARQUEE].map((club, i) => {
              const logo = CLUB_LOGOS[club.slug];
              return (
                <Link
                  key={`${club.slug}-${i}`}
                  href={`/team/${club.slug}`}
                  className="group flex flex-col items-center gap-2 shrink-0 w-20 sm:w-24"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center p-2 group-hover:bg-white group-hover:border-white transition">
                    {logo ? (
                      <img
                        src={logo}
                        alt={club.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-purple-200 text-xs font-bold">{club.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-purple-100 font-medium text-center leading-tight truncate w-full">
                    {club.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT SECTIONS — tabbed (New / Featured / Best Sellers) ═══ */}
      <HomeProducts />

      {/* ═══ CONTACT US — beautiful section with IG, FB, WhatsApp ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a14] via-[#111827] to-[#0a0a14]">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 md:py-20 text-center">
          <p className="text-orange-400 text-xs font-bold tracking-[0.3em] uppercase mb-3">Get in Touch</p>
          <h2 className="font-heading text-4xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">
            Contact Us
          </h2>
          <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto mb-10 leading-relaxed">
            Questions about sizing, availability, or custom orders? Reach out on any of these platforms — we reply fast.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {/* WhatsApp */}
            <a
              href="https://wa.me/212628552405"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-green-400/50 hover:bg-green-500/5 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center group-hover:bg-green-500/25 transition">
                <svg className="w-7 h-7 text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-1">WhatsApp</p>
                <p className="text-white/50 text-xs">+212 628-552405</p>
              </div>
              <span className="text-green-400 text-xs font-semibold group-hover:underline">Chat now →</span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/mebutiksports"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-400/50 hover:bg-pink-500/5 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-pink-500/15 flex items-center justify-center group-hover:bg-pink-500/25 transition">
                <svg className="w-7 h-7 text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-1">Instagram</p>
                <p className="text-white/50 text-xs">@mebutiksports</p>
              </div>
              <span className="text-pink-400 text-xs font-semibold group-hover:underline">Follow us →</span>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/share/g/17KZPZsjhE/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-blue-500/5 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition">
                <svg className="w-7 h-7 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-1">Facebook</p>
                <p className="text-white/50 text-xs">Our Group</p>
              </div>
              <span className="text-blue-400 text-xs font-semibold group-hover:underline">Join us →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ RETRO EDIT — only shown if there are retro products ═══ */}
      {retroProducts.length > 0 && (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#2a1a0e] via-[#3a2414] to-[#1a0f08]">
          {/* Vintage texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 10px)",
            }}
          />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px]" />

          <div className="mx-auto max-w-7xl px-4 py-16 relative z-10">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <p className="text-amber-300 text-xs font-bold tracking-[0.3em] uppercase mb-2">Est. Archive</p>
                <h2 className="font-heading text-4xl md:text-5xl font-black text-amber-50 tracking-tight uppercase">
                  <span className="italic font-serif font-normal">The</span> Retro Edit
                </h2>
                <p className="mt-2 text-sm text-amber-100/60 max-w-md">
                  Vintage kits from iconic eras — the shirts that defined a generation.
                </p>
              </div>
              <Link
                href="/products?category=retro"
                className="inline-flex items-center gap-2 bg-amber-50 hover:bg-white text-[#2a1a0e] font-bold px-6 py-3 rounded-lg transition text-sm"
              >
                See all retros <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" delay={70}>
              {retroProducts.map((product) => {
                const images = parseProductImages(product.images);
                return (
                  <Link key={product.id} href={`/product/${product.slug}`} className="group block stagger-item">
                    <div className="aspect-square rounded-xl overflow-hidden bg-[#1a0f08] border border-amber-200/10 group-hover:border-amber-300/60 transition relative">
                      {images[0] ? (
                        <img
                          src={images[0]}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-serif italic text-4xl text-amber-200/40">R</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-amber-50 text-[#2a1a0e] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Retro
                      </span>
                    </div>
                    <div className="mt-2.5 px-0.5">
                      <p className="text-xs text-amber-200/50 font-medium truncate">{product.team.name}</p>
                      <p className="text-sm text-amber-50 font-semibold truncate mt-0.5 group-hover:text-amber-200 transition">
                        {product.name}
                      </p>
                      <p className="text-sm text-amber-300 font-bold mt-1">${product.price}</p>
                    </div>
                  </Link>
                );
              })}
            </StaggerGrid>
          </div>
        </section>
      )}

      {/* ═══ PRE-ORDER STRIP — only shown if there are pre-order items ═══ */}
      {preorderProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="text-orange-500 text-xs font-bold tracking-[0.3em] uppercase mb-2">Incoming</p>
              <h2 className="font-heading text-3xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">
                Pre-Order Now
              </h2>
              <p className="mt-2 text-sm text-gray-500 max-w-md">
                Reserve your kit — shipped as soon as it lands in our warehouse.
              </p>
            </div>
            <Link
              href="/products?surCommande=true"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition text-sm"
            >
              See all pre-orders <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" delay={70}>
            {preorderProducts.map((product) => {
              const images = parseProductImages(product.images);
              return (
                <Link key={product.id} href={`/product/${product.slug}`} className="group block stagger-item">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group-hover:border-orange-400 transition relative">
                    {images[0] && (
                      <img
                        src={images[0]}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Pre-order
                    </span>
                  </div>
                  <div className="mt-2.5 px-0.5">
                    <p className="text-xs text-gray-400 font-medium truncate">{product.team.name}</p>
                    <p className="text-sm text-gray-900 font-semibold truncate mt-0.5 group-hover:text-orange-500 transition">
                      {product.name}
                    </p>
                    <p className="text-sm text-orange-500 font-bold mt-1">${product.price}</p>
                  </div>
                </Link>
              );
            })}
          </StaggerGrid>
        </section>
      )}

      {/* ═══ TRUST STRIP — always shown ═══ */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Truck,
              title: "Fast Delivery",
              body: "Shipped across Morocco. Cash on delivery available in most cities.",
            },
            {
              icon: MessageCircle,
              title: "WhatsApp Support",
              body: "Prefer WhatsApp? Tap the green button, size and name customisation included.",
              cta: { label: "Chat now", href: "https://wa.me/212628552405", external: true },
            },
            {
              icon: ShieldCheck,
              title: "Authentic Stock",
              body: "Hand-picked quality, ships from our Rabat warehouse.",
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">{feature.body}</p>
                {feature.cta &&
                  (feature.cta.external ? (
                    <a
                      href={feature.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 text-sm font-semibold text-orange-500 hover:underline"
                    >
                      {feature.cta.label} →
                    </a>
                  ) : (
                    <Link href={feature.cta.href} className="mt-3 text-sm font-semibold text-orange-500 hover:underline">
                      {feature.cta.label} →
                    </Link>
                  ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
