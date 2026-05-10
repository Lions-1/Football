import { prisma } from "@/lib/prisma";
import { Search } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import { firstProductImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q || "";

  let products: Array<{
    id: string; name: string; slug: string; price: number;
    images: string; surCommande: boolean; category: string;
    team: { name: string; league: { name: string } };
  }> = [];

  if (query) {
    products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { team: { name: { contains: query } } },
          { team: { league: { name: { contains: query } } } },
        ],
      },
      include: { team: { include: { league: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Search className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">
            {query ? `Results for "${query}"` : "Search"}
          </h1>
          {query && (
            <p className="text-sm text-gray-500">{products.length} products found</p>
          )}
        </div>
      </div>

      {!query ? (
        <p className="text-gray-500 text-center py-16">Enter a search term to find jerseys</p>
      ) : (
        <ProductGrid
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: firstProductImage(p.images),
            teamName: p.team.name,
            surCommande: p.surCommande,
            category: p.category,
          }))}
        />
      )}
    </div>
  );
}
