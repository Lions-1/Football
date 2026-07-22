import { prisma } from "@/lib/prisma";
import { parseProductImages } from "@/lib/product-images";
import { NextRequest, NextResponse } from "next/server";

const IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";

/**
 * Serves a single product image (decoded from the base64 stored in the DB) so
 * the bytes are NOT inlined into page HTML and can be cached on the CDN /
 * browser for a year. Keyed by product id + index into the deduped image list
 * (same order `productImageSrcs` produces, so indices always line up).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> }
) {
  const { id, idx } = await params;
  const i = Number.parseInt(idx, 10) || 0;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { images: true },
  });
  if (!product) return new NextResponse("Not found", { status: 404 });

  const src = parseProductImages(product.images)[i];
  if (!src) return new NextResponse("Not found", { status: 404 });

  const m = src.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) {
    // Not base64 (a remote URL slipped through) — redirect to it.
    return NextResponse.redirect(src, 308);
  }

  const buffer = Buffer.from(m[2], "base64");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: { "Content-Type": m[1] || "image/jpeg", "Cache-Control": IMMUTABLE },
  });
}
