/**
 * Migrate all product image URLs from direct photo.yupoo.com to /api/img/* proxy
 * so they bypass Yupoo's Referer-based hotlink protection.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const YUPOO_PREFIX = "https://photo.yupoo.com/";
const PROXY_PREFIX = "/api/img/";

const products = await p.product.findMany({
  where: { images: { contains: "photo.yupoo.com" } },
  select: { id: true, images: true, slug: true },
});

console.log(`Found ${products.length} products with photo.yupoo.com URLs`);

let updated = 0;
let totalUrlsRewritten = 0;

for (const prod of products) {
  let imgs;
  try {
    imgs = JSON.parse(prod.images);
  } catch {
    continue;
  }
  if (!Array.isArray(imgs)) continue;

  let changedHere = 0;
  const newImgs = imgs.map(u => {
    if (typeof u === "string" && u.startsWith(YUPOO_PREFIX)) {
      changedHere++;
      return PROXY_PREFIX + u.slice(YUPOO_PREFIX.length);
    }
    return u;
  });

  if (changedHere === 0) continue;

  await p.product.update({
    where: { id: prod.id },
    data: { images: JSON.stringify(newImgs) },
  });
  updated++;
  totalUrlsRewritten += changedHere;
}

console.log(`Updated ${updated} products, rewrote ${totalUrlsRewritten} URLs total`);

// Sanity: show first 3 examples after
const samples = await p.product.findMany({
  where: { images: { contains: "/api/img/" } },
  take: 3,
  include: { team: true },
});
console.log("\nSample post-migration:");
for (const s of samples) {
  const imgs = JSON.parse(s.images);
  console.log(`  ${s.team.name} — ${s.name.slice(0,50)}`);
  console.log(`    first img: ${imgs[0]}`);
}

await p.$disconnect();
