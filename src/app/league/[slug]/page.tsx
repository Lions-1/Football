import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProductGrid from "@/components/ProductGrid";
import { LEAGUE_LOGOS, COUNTRY_FLAGS, CLUB_LOGOS, CHAMPIONS_LEAGUE_CLUBS } from "@/lib/leagues-data";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LeaguePage({ params }: Props) {
  const { slug } = await params;

  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      teams: {
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  if (!league) notFound();

  // Champions League: teams live in domestic leagues, so load them via the slug list.
  const isChampionsLeague = slug === "champions-league";

  const displayTeams = isChampionsLeague
    ? await prisma.team.findMany({
        where: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } },
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
      })
    : league.teams;

  const products = await prisma.product.findMany({
    where: isChampionsLeague
      ? {
          team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } },
          // Current season only — older jerseys remain visible on the domestic league pages
          OR: [
            { season: { contains: "25/26" } },
            { season: { contains: "2025-26" } },
            { name: { contains: "25/26" } },
            { name: { contains: "2025/26" } },
            { name: { contains: "25-26" } },
          ],
        }
      : { team: { leagueId: league.id } },
    include: { team: { include: { league: true } } },
    orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
    take: 80,
  });

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
            {displayTeams.map((team) => (
              <Link
                key={team.id}
                href={`/team/${team.slug}`}
                className="group bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl p-4 text-center transition-all shadow-sm flex flex-col items-center gap-2"
              >
                {CLUB_LOGOS[team.slug] ? (
                  <div className="w-12 h-12 relative">
                    <img src={CLUB_LOGOS[team.slug]} alt={team.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-black text-lg">{team.name.charAt(0)}</div>
                )}
                <p className="text-xs font-semibold text-center leading-tight">{team.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Products */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All Products</h2>
        <ProductGrid
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: (JSON.parse(p.images) as string[])[0] || "",
            teamName: p.team.name,
            teamSlug: p.team.slug,
            surCommande: p.surCommande,
            category: p.category,
          }))}
        />
      </section>
    </div>
  );
}
