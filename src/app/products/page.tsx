import { prisma } from "@/lib/prisma";
import { CATEGORIES, SIZES, MAIN_NAV_BUCKETS } from "@/lib/leagues-data";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import ProductSearch from "@/components/ProductSearch";
import CantFindCTA from "@/components/CantFindCTA";
import FilterSidebar from "@/components/FilterSidebar";
import { firstProductImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    category?: string;
    surCommande?: string;
    page?: string;
    league?: string;
    team?: string;
    q?: string;
    sizes?: string;
  }>;
}

// Sidebar leagues — the six football leagues the site is built around. We
// deliberately skip "national-teams" in the league list because Morocco has
// its own featured link above.
const SIDEBAR_LEAGUE_SLUGS = [
  "premier-league",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "champions-league",
];

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category;
  const surCommande = params.surCommande === "true";
  const leagueFilter = params.league;
  const teamFilter = params.team;
  const searchQuery = params.q?.trim() || "";
  const selectedSizes = (params.sizes || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SIZES.includes(s));
  const page = parseInt(params.page || "1");
  const limit = 40;

  const where: Prisma.ProductWhereInput = {};
  const andClauses: Prisma.ProductWhereInput[] = [];

  if (category) where.category = category;
  if (surCommande) where.surCommande = true;
  if (teamFilter) where.team = { slug: teamFilter };
  else if (leagueFilter) where.team = { league: { slug: leagueFilter } };
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery } },
      { team: { name: { contains: searchQuery } } },
    ];
  }

  // Size filter — products whose `sizes` JSON string contains ANY selected size.
  // `sizes` is stored as e.g. '["S","M","L"]', so `contains: '"M"'` matches.
  if (selectedSizes.length > 0) {
    andClauses.push({
      OR: selectedSizes.map((s) => ({ sizes: { contains: `"${s}"` } })),
    });
  }
  if (andClauses.length > 0) where.AND = andClauses;

  function buildUrl(overrides: Partial<{ sizes: string[]; page: number }>) {
    const parts: string[] = [];
    if (category) parts.push(`category=${category}`);
    if (surCommande) parts.push(`surCommande=true`);
    if (leagueFilter) parts.push(`league=${leagueFilter}`);
    if (teamFilter) parts.push(`team=${teamFilter}`);
    if (searchQuery) parts.push(`q=${encodeURIComponent(searchQuery)}`);
    const nextSizes = overrides.sizes ?? selectedSizes;
    if (nextSizes.length > 0) parts.push(`sizes=${nextSizes.join(",")}`);
    if (overrides.page) parts.push(`page=${overrides.page}`);
    return `/products${parts.length ? "?" + parts.join("&") : ""}`;
  }

  function buildPageUrl(p: number) {
    return buildUrl({ page: p });
  }

  function toggleSizeHref(size: string) {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    return buildUrl({ sizes: next });
  }

  const [products, total, leagues, categoryCounts] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { team: { include: { league: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.product.count({ where }),
    prisma.league.findMany({ orderBy: { order: "asc" } }),
    prisma.product.groupBy({
      by: ["category"],
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Only surface categories with at least one product so the sidebar
  // doesn't advertise empty filters.
  const categoryHasProducts = new Map(
    categoryCounts.map((c) => [c.category || "", c._count._all]),
  );
  const visibleCategories = CATEGORIES.filter(
    (c) => (categoryHasProducts.get(c.slug) ?? 0) > 0,
  );

  // Sidebar leagues — limit to the six we feature, preserve the NAV order.
  const sidebarLeagues = SIDEBAR_LEAGUE_SLUGS
    .map((slug) => leagues.find((l) => l.slug === slug))
    .filter((l): l is (typeof leagues)[number] => Boolean(l));

  const title =
    searchQuery ? `Search: "${searchQuery}"` :
    teamFilter === "morocco" ? "Morocco" :
    category === "retro" ? "Retro Classics" :
    category ? CATEGORIES.find((c) => c.slug === category)?.name || "Products" :
    surCommande ? "Pre-Order" :
    leagueFilter ? MAIN_NAV_BUCKETS.find((b) => b.slug === leagueFilter)?.name || "Products" :
    "All Products";

  function sidebarClass(active: boolean) {
    return `block text-sm px-3 py-1.5 rounded-lg transition ${
      active ? "bg-orange-50 text-orange-500 font-medium" : "text-gray-500 hover:text-gray-900"
    }`;
  }

  const noFilters =
    !category && !surCommande && !leagueFilter && !teamFilter && !searchQuery && selectedSizes.length === 0;

  // Show max 7 page buttons around current page
  const pageStart = Math.max(1, page - 3);
  const pageEnd = Math.min(totalPages, page + 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0 order-2 md:order-1">
          <FilterSidebar>
          {/* Search */}
          <div className="mb-6">
            <ProductSearch initialQuery={searchQuery} />
          </div>

          {/* Featured sections */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Featured</h3>
          <div className="space-y-1 mb-6">
            <Link href="/products" className={sidebarClass(noFilters)}>
              All Products
            </Link>
            <Link
              href="/team/morocco"
              className={sidebarClass(teamFilter === "morocco")}
            >
              Morocco
            </Link>
            <Link
              href="/products?category=retro"
              className={sidebarClass(category === "retro" && !surCommande)}
            >
              Retro Classics
            </Link>
            <Link
              href="/products?surCommande=true"
              className={sidebarClass(surCommande && !leagueFilter && !teamFilter && !category)}
            >
              Pre-Order
            </Link>
          </div>

          {/* Sizes — multi-select chips. Clicking a size toggles it in the URL. */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Size</h3>
            {selectedSizes.length > 0 && (
              <Link
                href={buildUrl({ sizes: [] })}
                className="text-[10px] text-orange-500 hover:underline font-semibold uppercase tracking-wider"
              >
                Clear
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {SIZES.map((size) => {
              const active = selectedSizes.includes(size);
              return (
                <Link
                  key={size}
                  href={toggleSizeHref(size)}
                  className={`min-w-[2.5rem] text-center text-xs font-bold border rounded-lg px-3 py-1.5 transition ${
                    active
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500"
                  }`}
                >
                  {size}
                </Link>
              );
            })}
          </div>

          {/* Categories — only show ones with products */}
          {visibleCategories.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
              <div className="space-y-1 mb-6">
                {visibleCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/products?category=${cat.slug}`}
                    className={sidebarClass(category === cat.slug)}
                  >
                    {cat.name}
                    <span className="ml-1.5 text-[10px] text-gray-400">
                      {categoryHasProducts.get(cat.slug)}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Leagues — only our six featured ones */}
          {sidebarLeagues.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Leagues</h3>
              <div className="space-y-1">
                {sidebarLeagues.map((league) => (
                  <Link
                    key={league.id}
                    href={`/league/${league.slug}`}
                    className="block text-sm px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-900 transition"
                  >
                    {league.name}
                  </Link>
                ))}
              </div>
            </>
          )}
          </FilterSidebar>
        </aside>

        {/* Products grid */}
        <div className="flex-1 min-w-0 order-1 md:order-2">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {total > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {total} product{total === 1 ? "" : "s"}
                  {selectedSizes.length > 0 && <span> · Size {selectedSizes.join(", ")}</span>}
                </p>
              )}
            </div>
          </div>

          <ProductGrid
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: p.price,
              image: firstProductImage(p.images),
              teamName: p.team.name,
              teamSlug: p.team.slug,
              surCommande: p.surCommande,
              category: p.category,
            }))}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                >
                  Previous
                </Link>
              )}
              {pageStart > 1 && (
                <>
                  <Link href={buildPageUrl(1)} className="w-10 h-10 flex items-center justify-center rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">1</Link>
                  {pageStart > 2 && <span className="text-gray-400 px-1">...</span>}
                </>
              )}
              {Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i).map((p) => (
                <Link
                  key={p}
                  href={buildPageUrl(p)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm transition ${
                    p === page
                      ? "bg-orange-500 text-white font-bold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {pageEnd < totalPages && (
                <>
                  {pageEnd < totalPages - 1 && <span className="text-gray-400 px-1">...</span>}
                  <Link href={buildPageUrl(totalPages)} className="w-10 h-10 flex items-center justify-center rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">{totalPages}</Link>
                </>
              )}
              {page < totalPages && (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition"
                >
                  Next
                </Link>
              )}
            </div>
          )}
          <CantFindCTA />
        </div>
      </div>
    </div>
  );
}
