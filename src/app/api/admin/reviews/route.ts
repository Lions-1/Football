import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/** List reviews (public — they're shown on the homepage). */
export async function GET() {
  const reviews = await prisma.review.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(reviews);
}

/** Add one or more review images. Body: { images: string[] }. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { images } = await request.json();
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "No images" }, { status: 400 });
  }

  const base = await prisma.review.count();
  const created = await prisma.$transaction(
    images.map((image: string, i: number) =>
      prisma.review.create({ data: { image, order: base + i } })
    )
  );

  revalidatePath("/"); // reflect on the homepage immediately
  return NextResponse.json(created, { status: 201 });
}

/** Delete a review by id (?id=...). */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.review.delete({ where: { id } });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
