import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { productImageSrcs } from "@/lib/product-images";

export async function GET(request: NextRequest) {
  const tab = new URL(request.url).searchParams.get("tab") || "new";

  const where =
    tab === "featured" ? { featured: true } :
    tab === "best" ? { bestSeller: true } :
    {};

  let products = await prisma.product.findMany({
    where,
    include: { team: true },
    orderBy: { createdAt: tab === "new" ? "desc" : "asc" },
    take: tab === "new" ? 8 : 60,
  });
  // Featured / Best Sellers: one home kit per club first (a showcase of the
  // big clubs), then their other kits — in catalogue order.
  if (tab !== "new") {
    products = products
      .map((p, i) => ({ p, i, home: p.slug.includes("-home") ? 0 : 1 }))
      .sort((a, b) => a.home - b.home || a.i - b.i)
      .map((x) => x.p)
      .slice(0, 8);
  }

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: productImageSrcs(p.id, p.images),
      teamName: p.team.name,
      teamSlug: p.team.slug,
      surCommande: p.surCommande,
      category: p.category,
    }))
  );
}
