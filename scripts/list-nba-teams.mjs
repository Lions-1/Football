import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const teams = await prisma.team.findMany({
  where: { league: { slug: "nba" } },
  select: { name: true, slug: true, _count: { select: { products: true } } },
  orderBy: { name: "asc" },
});
console.log("NBA teams:", teams.length);
for (const t of teams) {
  console.log(`  ${t.slug.padEnd(30)} ${t.name.padEnd(30)} products=${t._count.products}`);
}
await prisma.$disconnect();
