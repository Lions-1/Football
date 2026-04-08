import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const search = searchParams.get("search")?.trim() || "";

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { team: { name: { contains: search } } },
          { slug: { contains: search } },
        ],
      }
    : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { team: { include: { league: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, price, images, sizes, teamId, category, season, surCommande, featured, bestSeller } = body;

  if (!name || !price || !teamId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let slug = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description: description || null,
      price: parseFloat(price),
      images: JSON.stringify(images || []),
      sizes: JSON.stringify(sizes || ["S", "M", "L", "XL", "XXL"]),
      teamId,
      category: category || "jersey",
      season: season || null,
      surCommande: surCommande || false,
      featured: featured || false,
      bestSeller: bestSeller || false,
    },
    include: { team: { include: { league: true } } },
  });

  return NextResponse.json(product, { status: 201 });
}
