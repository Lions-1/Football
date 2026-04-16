import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Look for the exact placeholder pattern the user reported
const placeholderRegex = /(Training Kit|World Cup 2026 New Kit|2026 Away Kit Player Version|2026 Home Kit Player Version)$/;
const bad = await prisma.product.findMany({
  where: {
    team: { league: { slug: "national-teams" } },
  },
  include: { team: true },
});

console.log(`Total WC products: ${bad.length}\n`);

const placeholders = [];
for (const p of bad) {
  const imgs = JSON.parse(p.images || "[]");
  const hasShopify = imgs.some(u => typeof u === "string" && u.includes("cdn.shopify.com"));
  const looksLikeSeed = / X (Adidas|Nike|Puma|Kappa) /.test(p.name);
  if (looksLikeSeed || !hasShopify) {
    placeholders.push({ slug: p.slug, name: p.name, team: p.team.slug, imgs: imgs.length, hasShopify });
  }
}

console.log(`Placeholders/no-real-img (${placeholders.length}):`);
for (const p of placeholders.slice(0, 40)) {
  console.log(`  ${p.team.padEnd(18)} ${p.imgs} imgs shopify=${p.hasShopify}  ${p.name}`);
}

// Check specifically turkey/ecuador/tunisia/saudi-arabia
console.log("\nDirect check:");
for (const slug of ["turkey", "ecuador", "tunisia", "saudi-arabia"]) {
  const team = await prisma.team.findUnique({ where: { slug }, include: { products: true } });
  if (!team) { console.log(`  ${slug}: TEAM NOT FOUND`); continue; }
  console.log(`  ${slug}: ${team.products.length} products`);
  for (const p of team.products) {
    const imgs = JSON.parse(p.images || "[]");
    console.log(`    - ${p.name}  [${imgs.length} imgs]`);
  }
}

await prisma.$disconnect();
