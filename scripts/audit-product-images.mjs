/**
 * Audit: how many products have duplicate Yupoo images (big.jpg + hashed twin)?
 * Classify products by source so we know the real scope of the de-duplication + front-first cleanup.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const all = await prisma.product.findMany({ select: { id: true, name: true, images: true } });

let yupoo = 0;          // any /api/img/ URL
let yupooWithDupes = 0; // products where the big.jpg/hashed twin pattern produces dupes
let shopify = 0;
let other = 0;
let totalDupPairs = 0;

function yupooHash(url) {
  // Match /api/img/<source>/<hash>/<file>
  const m = url.match(/\/api\/img\/[^/]+\/([^/]+)\//);
  return m ? m[1] : null;
}

for (const p of all) {
  let imgs;
  try { imgs = JSON.parse(p.images); } catch { imgs = []; }
  if (!imgs.length) continue;

  const isYupoo   = imgs.some(u => u.includes("/api/img/"));
  const isShopify = imgs.some(u => u.includes("cdn.shopify.com"));
  if (isYupoo) yupoo++;
  else if (isShopify) shopify++;
  else other++;

  if (isYupoo) {
    // Count unique photo hashes
    const hashes = new Map();
    for (const u of imgs) {
      const h = yupooHash(u);
      if (h) hashes.set(h, (hashes.get(h) || 0) + 1);
    }
    const dupPairs = [...hashes.values()].filter(c => c > 1).length;
    if (dupPairs > 0) {
      yupooWithDupes++;
      totalDupPairs += dupPairs;
    }
  }
}

console.log(`Total products: ${all.length}`);
console.log(`  Yupoo-sourced: ${yupoo}   (with dup pairs: ${yupooWithDupes}, pairs: ${totalDupPairs})`);
console.log(`  Shopify:       ${shopify}`);
console.log(`  Other:         ${other}`);

await prisma.$disconnect();
