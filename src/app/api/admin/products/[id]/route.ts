import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      price: body.price ? parseFloat(body.price) : undefined,
      images: body.images ? JSON.stringify(body.images) : undefined,
      sizes: body.sizes ? JSON.stringify(body.sizes) : undefined,
      teamId: body.teamId,
      category: body.category,
      season: body.season || null,
      surCommande: body.surCommande,
      featured: body.featured,
      bestSeller: body.bestSeller,
      inStock: body.inStock,
    },
    include: { team: { include: { league: true } } },
  });

  revalidateTag("products", "max");
  revalidatePath("/", "layout");
  return NextResponse.json(product);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  revalidateTag("products", "max");
  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
