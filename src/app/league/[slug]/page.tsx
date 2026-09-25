import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProductGrid from "@/components/ProductGrid";
import { LEAGUE_LOGOS, COUNTRY_FLAGS, CLUB_LOGOS, CHAMPIONS_LEAGUE_CLUBS, SIZES } from "@/lib/leagues-data";
import { Prisma } from "@prisma/client";
import { firstProductImageSrc } from "@/lib/product-images";
import SizeFilterPills from "@/components/SizeFilterPills";
import CantFindCTA from "@/components/CantFindCTA";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sizes?: string }>;
}

// Cached data fetch, keyed by league slug + selected sizes. Returns small,
// already-mapped objects (NO base64) so the DB is queried only on a cache miss
// (hourly), not on every visit — lets Neon scale to zero between hits.
const getLeaguePage = unstable_cache(
  async (slug: string, sizesKey: string) => {
    const league = await prisma.league.findUnique({
      where: { slug },
      include: { teams: { orderBy: { name: "asc" } } },
    });
    if (!league) return null;

    // Champions League: teams live in domestic leagues, so load them via the slug list.
    const isChampionsLeague = slug === "champions-league";

    const displayTeams = isChampionsLeague
      ? await prisma.team.findMany({
          where: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } },
          orderBy: { name: "asc" },
        })
      : league.teams;

    const baseWhere: Prisma.ProductWhereInput = isChampionsLeague
      ? {
          team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } },
          // Current season only — older kits remain on the domestic league pages
          OR: [
            { season: { contains: "26/27" } },
            { season: { contains: "2026-27" } },
            { name: { contains: "26/27" } },
            { name: { contains: "2026/27" } },
            { name: { contains: "26-27" } },
          ],
        }
      : { team: { leagueId: league.id } };

    const selectedSizes = sizesKey ? sizesKey.split(",") : [];
    const where: Prisma.ProductWhereInput =
      selectedSizes.length > 0
        ? { AND: [baseWhere, { OR: selectedSizes.map((s) => ({ sizes: { contains: `"${s}"` } })) }] }
        : baseWhere;

    const products = await prisma.product.findMany({
      where,
      include: { team: { include: { league: true } } },
      orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
      take: 80,
    });

    return {
      league: { id: league.id, name: league.name, slug: league.slug },
      displayTeams: displayTeams.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      products: products.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, price: p.price,
        image: firstProductImageSrc(p.id, p.images),
        teamName: p.team.name, teamSlug: p.team.slug,
        surCommande: p.surCommande, category: p.category,
      })),
    };
  },
  ["league-page-v1"],
  { revalidate: 900, tags: ["products"] }
);

export default async function LeaguePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sizes: sizesParam } = await searchParams;
  const selectedSizes = (sizesParam || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SIZES.includes(s));

  const data = await getLeaguePage(slug, selectedSizes.join(","));
  if (!data) notFound();
  const { league, displayTeams, products } = data;

  const basePath = `/league/${league.slug}`;
  const buildSizeHref = (next: string[]) =>
    next.length > 0 ? `${basePath}?sizes=${next.join(",")}` : basePath;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 relative shrink-0">
          {LEAGUE_LOGOS[league.slug] ? (
            <Image src={LEAGUE_LOGOS[league.slug]} alt={league.name} fill className="object-contain" sizes="56px" unoptimized />
          ) : (
            <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-black text-xl">{league.name.charAt(0)}</div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="text-sm text-gray-500">{displayTeams.length} teams</p>
        </div>
      </div>

      {/* Teams grid — show flags for national teams */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Teams</h2>
        {league.slug === "national-teams" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {displayTeams.map((team) => {
              const flag = COUNTRY_FLAGS.find(
                (c) => c.name.toLowerCase() === team.name.toLowerCase()
              );
              return (
                <Link
                  key={team.id}
                  href={`/team/${team.slug}`}
                  className="group flex flex-col items-center gap-3 bg-white border border-gray-200 hover:border-orange-300 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="w-20 h-14 relative overflow-hidden rounded-md shadow-sm">
                    {flag?.code ? (
                      <img
                        src={`https://flagcdn.com/w160/${flag.code}.png`}
                        alt={team.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
                        {team.name.substring(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 text-center">{team.name}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayTeams.map((team) => {
              const logo = CLUB_LOGOS[team.slug];
              return (
                <Link
                  key={team.id}
                  href={`/team/${team.slug}`}
                  className="group bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl p-4 text-center transition-all shadow-sm flex flex-col items-center gap-2"
                >
                  {logo ? (
                    <div className="w-12 h-12 relative">
                      <img src={logo} alt={team.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-black text-lg">{team.name.charAt(0)}</div>
                  )}
                  <p className="text-xs font-semibold text-center leading-tight">{team.name}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Products */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">
            All Products
            {selectedSizes.length > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                · Size {selectedSizes.join(", ")}
              </span>
            )}
          </h2>
        </div>
        <SizeFilterPills
          selectedSizes={selectedSizes}
          buildHref={buildSizeHref}
          clearHref={basePath}
          className="mb-5"
        />
        <ProductGrid products={products} />
      </section>
      <CantFindCTA context={league.name} />
    </div>
  );
}
