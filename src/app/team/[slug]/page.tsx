import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, MessageCircle, ArrowLeft } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import { CLUB_LOGOS, COUNTRY_FLAGS, SIZES } from "@/lib/leagues-data";
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

// Cached data fetch, keyed by team slug + selected sizes. Returns small,
// already-mapped objects (NO base64) so the DB is queried only on a cache miss
// (hourly) instead of every visit — letting Neon scale to zero between hits.
const getTeamPage = unstable_cache(
  async (slug: string, sizesKey: string) => {
    const team = await prisma.team.findUnique({
      where: { slug },
      include: { league: true },
    });
    if (!team) return null;

    const selectedSizes = sizesKey ? sizesKey.split(",") : [];
    const where: Prisma.ProductWhereInput =
      selectedSizes.length > 0
        ? { teamId: team.id, OR: selectedSizes.map((s) => ({ sizes: { contains: `"${s}"` } })) }
        : { teamId: team.id };

    const products = await prisma.product.findMany({
      where,
      include: { team: { include: { league: true } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      team: {
        id: team.id, name: team.name, slug: team.slug,
        league: { name: team.league.name, slug: team.league.slug },
      },
      products: products.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, price: p.price,
        image: firstProductImageSrc(p.id, p.images),
        teamName: p.team.name, teamSlug: p.team.slug,
        surCommande: p.surCommande, category: p.category,
      })),
    };
  },
  ["team-page-v1"],
  { revalidate: 900, tags: ["products"] }
);

export default async function TeamPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sizes: sizesParam } = await searchParams;
  const selectedSizes = (sizesParam || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SIZES.includes(s));

  const data = await getTeamPage(slug, selectedSizes.join(","));
  if (!data) notFound();
  const { team, products } = data;

  const basePath = `/team/${team.slug}`;
  const buildSizeHref = (next: string[]) =>
    next.length > 0 ? `${basePath}?sizes=${next.join(",")}` : basePath;

  // Resolve a crest from whichever lookup applies to this team
  const flag = COUNTRY_FLAGS.find((c) => c.slug === team.slug);
  const crest =
    CLUB_LOGOS[team.slug] ||
    (flag ? `https://flagcdn.com/w160/${flag.code}.png` : null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-900 transition">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/league/${team.league.slug}`} className="hover:text-gray-900 transition">
          {team.league.name}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-400">{team.name}</span>
      </nav>

      <div className="flex items-center gap-4 mb-8">
        {crest && (
          <div className="w-16 h-16 relative shrink-0">
            <img src={crest} alt={team.name} className="w-full h-full object-contain" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{team.league.name}</p>
        </div>
      </div>

      {/* Size filter — always visible above the grid so customers can narrow
          down by size without leaving the team page. */}
      {(products.length > 0 || selectedSizes.length > 0) && (
        <SizeFilterPills
          selectedSizes={selectedSizes}
          buildHref={buildSizeHref}
          clearHref={basePath}
          className="mb-6"
        />
      )}

      {products.length === 0 ? (
        <>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-14 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedSizes.length > 0
                ? `No ${team.name} kits in size ${selectedSizes.join(", ")}`
                : `More ${team.name} pieces coming soon`}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {selectedSizes.length > 0
                ? "Try a different size, or WhatsApp us — we'll source it for you."
                : "We're restocking this team. Message us on WhatsApp to reserve your size or request a specific kit — we'll source it for you."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://wa.me/212628552405?text=${encodeURIComponent(`Hi! I'm looking for ${team.name} jerseys.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-lg transition text-sm"
              >
                <MessageCircle className="w-4 h-4" /> Order on WhatsApp
              </a>
              <Link
                href={`/league/${team.league.slug}`}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 text-gray-900 font-semibold px-5 py-2.5 rounded-lg transition text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to {team.league.name}
              </Link>
            </div>
          </div>
        </div>
        <CantFindCTA context={team.name} />
        </>
      ) : (
        <>
        <ProductGrid products={products} />
        <CantFindCTA context={team.name} />
        </>
      )}
    </div>
  );
}
