import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";

/** Serves a customer-review image (decoded from the base64 stored in the DB). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const review = await prisma.review.findUnique({
    where: { id },
    select: { image: true },
  });
  if (!review) return new NextResponse("Not found", { status: 404 });

  const m = review.image.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return NextResponse.redirect(review.image, 308);

  const buffer = Buffer.from(m[2], "base64");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: { "Content-Type": m[1] || "image/jpeg", "Cache-Control": IMMUTABLE },
  });
}
