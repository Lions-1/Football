import { prisma } from "@/lib/prisma";
import TapLink from "@/components/TapLink";
import Image from "next/image";
import { ArrowRight, Trophy } from "lucide-react";
import { LEAGUE_LOGOS, CHAMPIONS_LEAGUE_CLUBS } from "@/lib/leagues-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Leagues — Mebutik Sports",
  description:
    "Browse every football league we stock — Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the Champions League. Tap any league to see its teams and current-season jerseys.",
};

export default async function AllLeaguesPage() {
  const leagues = await prisma.league.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { teams: true } },
      teams: {
        select: { _count: { select: { products: true } } },
      },
    },
  });

  // Champions League is virtual — its teams live in domestic leagues.
  // Count them separately so the card doesn't say "0 teams".
  const clProductCount = await prisma.product.count({
    where: { team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } } },
  });

  // Compute total product count per league
  const enriched = leagues.map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    teamCount:
      l.slug === "champions-league" ? CHAMPIONS_LEAGUE_CLUBS.length : l._count.teams,
    productCount:
      l.slug === "champions-league"
        ? clProductCount
        : l.teams.reduce((acc, t) => acc + t._count.products, 0),
  }));

  // Sort: leagues with products first, then alphabetically
  enriched.sort((a, b) => {
    if ((b.productCount > 0 ? 1 : 0) !== (a.productCount > 0 ? 1 : 0)) {
      return (b.productCount > 0 ? 1 : 0) - (a.productCount > 0 ? 1 : 0);
    }
    return b.productCount - a.productCount;
  });

  const totalProducts = enriched.reduce((a, l) => a + l.productCount, 0);
  const totalTeams = enriched.reduce((a, l) => a + l.teamCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Trophy className="w-3.5 h-3.5" />
            Catalogue
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
            All Leagues
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-3 max-w-2xl">
            Every competition we stock — Europe's top 5 leagues and the
            Champions League. Tap any tile to see its teams and current-season kits.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-3xl font-black text-orange-500">All</p>
            <p className="text-gray-500 uppercase text-[10px] tracking-wider font-bold">Leagues</p>
          </div>
          <div>
            <p className="text-3xl font-black text-orange-500">{totalTeams}</p>
            <p className="text-gray-500 uppercase text-[10px] tracking-wider font-bold">Teams</p>
          </div>
          <div>
            <p className="text-3xl font-black text-orange-500">{totalProducts}</p>
            <p className="text-gray-500 uppercase text-[10px] tracking-wider font-bold">Products</p>
          </div>
        </div>
      </div>

      {/* League grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {enriched.map((league) => {
          const logo = LEAGUE_LOGOS[league.slug];
          const empty = league.productCount === 0;
          return (
            <TapLink
              key={league.id}
              href={`/league/${league.slug}`}
              selectedClassName="border-orange-500 ring-2 ring-orange-400 shadow-lg"
              className={`group flex items-center gap-4 bg-white border-2 rounded-2xl p-5 transition-all shadow-sm ${
                empty
                  ? "border-gray-100 opacity-70 hover:opacity-100 hover:border-gray-300"
                  : "border-gray-200 hover:border-orange-400 hover:shadow-lg"
              }`}
            >
              <div className="w-16 h-16 relative shrink-0 bg-gray-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                {logo ? (
                  <Image
                    src={logo}
                    alt={league.name}
                    fill
                    className="object-contain p-2"
                    sizes="64px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 font-black text-2xl">
                    {league.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-base font-bold text-gray-900 group-hover:text-orange-600 transition truncate">
                  {league.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {league.teamCount} {league.teamCount === 1 ? "team" : "teams"}
                  {league.productCount > 0 && (
                    <>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className="text-orange-500 font-semibold">
                        {league.productCount} {league.productCount === 1 ? "product" : "products"}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </TapLink>
          );
        })}
      </div>
    </div>
  );
}
