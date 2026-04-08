import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";

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

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{team.league.name}</p>
      </div>

      <ProductGrid
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: (JSON.parse(p.images) as string[])[0] || "",
          teamName: p.team.name,
          surCommande: p.surCommande,
          category: p.category,
        }))}
      />
    </div>
  );
}
