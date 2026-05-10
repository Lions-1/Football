import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, MessageCircle, ArrowLeft } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import { CLUB_LOGOS, NBA_TEAM_LOGOS, COUNTRY_FLAGS } from "@/lib/leagues-data";
import { firstProductImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;

  const team = await prisma.team.findUnique({
    where: { slug },
    include: { league: true },
  });

  if (!team) notFound();

  const products = await prisma.product.findMany({
    where: { teamId: team.id },
    include: { team: { include: { league: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Resolve a crest from whichever lookup applies to this team
  const flag = COUNTRY_FLAGS.find((c) => c.slug === team.slug);
  const crest =
    CLUB_LOGOS[team.slug] ||
    NBA_TEAM_LOGOS[team.slug] ||
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

      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-14 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900">More {team.name} pieces coming soon</h2>
            <p className="mt-2 text-sm text-gray-500">
              We’re restocking this team. Message us on WhatsApp to reserve your size or request a specific kit — we’ll source it for you.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://wa.me/21261614253?text=${encodeURIComponent(`Hi! I'm looking for ${team.name} jerseys.`)}`}
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
      ) : (
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
      )}
    </div>
  );
}
