import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseProductImages } from "@/lib/product-images";

export async function GET(request: NextRequest) {
  const tab = new URL(request.url).searchParams.get("tab") || "new";

  const where =
    tab === "featured" ? { featured: true } :
    tab === "best" ? { bestSeller: true } :
    {};

  const products = await prisma.product.findMany({
    where,
    include: { team: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: parseProductImages(p.images),
      teamName: p.team.name,
      teamSlug: p.team.slug,
      surCommande: p.surCommande,
      category: p.category,
    }))
  );
}
