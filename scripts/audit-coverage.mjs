import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

console.log("=== NATIONAL TEAMS (WC2026) ===");
const wc = await prisma.team.findMany({
  where: { league: { slug: "national-teams" } },
  select: { name: true, slug: true, _count: { select: { products: true } } },
  orderBy: { name: "asc" },
});
const wcEmpty = wc.filter((t) => t._count.products === 0);
const wcFilled = wc.filter((t) => t._count.products > 0);
console.log(`Total: ${wc.length} | Filled: ${wcFilled.length} | Empty: ${wcEmpty.length}`);
console.log("\n-- EMPTY (need products) --");
for (const t of wcEmpty) console.log(`  ${t.slug}`);
console.log("\n-- FILLED --");
for (const t of wcFilled) console.log(`  ${t.slug.padEnd(20)} count=${t._count.products}`);

console.log("\n=== NBA ===");
const nba = await prisma.team.findMany({
  where: { league: { slug: "nba" } },
  select: { name: true, slug: true, _count: { select: { products: true } } },
  orderBy: { name: "asc" },
});
const nbaEmpty = nba.filter((t) => t._count.products === 0);
console.log(`Total: ${nba.length} | Empty: ${nbaEmpty.length}`);
for (const t of nba) console.log(`  ${t.slug.padEnd(28)} count=${t._count.products}`);

await prisma.$disconnect();
