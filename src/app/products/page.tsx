import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/leagues-data";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import ProductSearch from "@/components/ProductSearch";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    category?: string;
    surCommande?: string;
    page?: string;
    league?: string;
    team?: string;
    q?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category;
  const surCommande = params.surCommande === "true";
  const leagueFilter = params.league;
  const teamFilter = params.team;
  const searchQuery = params.q?.trim() || "";
  const page = parseInt(params.page || "1");
  const limit = 40;

  const where: Prisma.ProductWhereInput = {};
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

  function buildPageUrl(p: number) {
    const parts: string[] = [];
    if (category) parts.push(`category=${category}`);
    if (surCommande) parts.push(`surCommande=true`);
    if (leagueFilter) parts.push(`league=${leagueFilter}`);
    if (teamFilter) parts.push(`team=${teamFilter}`);
    if (searchQuery) parts.push(`q=${encodeURIComponent(searchQuery)}`);
    parts.push(`page=${p}`);
    return `/products?${parts.join("&")}`;
  }

  const [products, total, leagues] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { team: { include: { league: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.product.count({ where }),
    prisma.league.findMany({ orderBy: { order: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const title =
    searchQuery ? `Search: "${searchQuery}"` :
    teamFilter === "morocco" ? "Morocco Jerseys" :
    leagueFilter === "national-teams" ? "World Cup 2026" :
    category ? CATEGORIES.find((c) => c.slug === category)?.name || "Products" :
    surCommande ? "Pre-Order" :
    "All Products";

  function sidebarClass(active: boolean) {
    return `block text-sm px-3 py-1.5 rounded-lg transition ${
      active ? "bg-orange-50 text-orange-500 font-medium" : "text-gray-500 hover:text-gray-900"
    }`;
  }

  const noFilters = !category && !surCommande && !leagueFilter && !teamFilter && !searchQuery;

  // Show max 7 page buttons around current page
  const pageStart = Math.max(1, page - 3);
  const pageEnd = Math.min(totalPages, page + 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0">
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
              href="/products?league=national-teams"
              className={sidebarClass(leagueFilter === "national-teams" && !teamFilter)}
            >
              World Cup 2026
            </Link>
            <Link
              href="/products?team=morocco"
              className={sidebarClass(teamFilter === "morocco")}
            >
              Morocco
            </Link>
            <Link
              href="/products?surCommande=true"
              className={sidebarClass(surCommande && !leagueFilter && !teamFilter)}
            >
              Pre-Order
            </Link>
          </div>

          {/* Categories */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
          <div className="space-y-1 mb-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className={sidebarClass(category === cat.slug)}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Leagues */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Leagues</h3>
          <div className="space-y-1">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/league/${league.slug}`}
                className="block text-sm px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-900 transition"
              >
                {league.name}
              </Link>
            ))}
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>

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
        </div>
      </div>
    </div>
  );
}
