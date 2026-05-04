/**
 * Revert: delete all products sourced from pulsesfootball.com.
 * They're identifiable by their image URLs containing cdn.shopify.com.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const all = await prisma.product.findMany({
  select: { id: true, slug: true, images: true, team: { select: { slug: true, league: { select: { slug: true } } } } },
});

const pulses = all.filter((p) => {
  try {
    const imgs = JSON.parse(p.images);
    return imgs.some((u) => typeof u === "string" && u.includes("cdn.shopify.com"));
  } catch {
    return false;
  }
});

console.log(`Found ${pulses.length} pulsesfootball products to delete.`);
const byLeague = {};
for (const p of pulses) {
  const k = p.team.league.slug;
  byLeague[k] = (byLeague[k] || 0) + 1;
}
console.log("Per league:", byLeague);

if (pulses.length === 0) {
  console.log("Nothing to delete.");
} else {
  const ids = pulses.map((p) => p.id);
  // Delete any order/wishlist items referencing these first (if any)
  await prisma.wishlistItem.deleteMany({ where: { productId: { in: ids } } });
  const res = await prisma.product.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted: ${res.count} products`);
}

await prisma.$disconnect();
