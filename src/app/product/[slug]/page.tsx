import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { parseProductImages, firstProductImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { team: { include: { league: true } } },
  });

  if (!product) notFound();

  const related = await prisma.product.findMany({
    where: { teamId: product.teamId, id: { not: product.id } },
    include: { team: { include: { league: true } } },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProductDetail
      product={{
        ...product,
        images: parseProductImages(product.images),
        sizes: JSON.parse(product.sizes) as string[],
        teamName: product.team.name,
        leagueName: product.team.league.name,
        leagueSlug: product.team.league.slug,
        teamSlug: product.team.slug,
      }}
      related={related.map((p) => ({
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
  );
}
