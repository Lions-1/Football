/**
 * Sample 40 products across F1/NBA/WC/football sources and print their image arrays
 * so we can see if images[0] is reliably the "front" shot or if we need to reorder.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const samples = [
  { label: "F1",        where: { team: { league: { slug: "f1" } } } },
  { label: "NBA",       where: { team: { league: { slug: "nba" } } } },
  { label: "WC/NT",     where: { team: { league: { slug: "national-teams" } } } },
  { label: "PL",        where: { team: { league: { slug: "premier-league" } } } },
  { label: "La Liga",   where: { team: { league: { slug: "la-liga" } } } },
];

for (const { label, where } of samples) {
  const rows = await prisma.product.findMany({
    where,
    take: 8,
    include: { team: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n=== ${label} (${rows.length} samples) ===`);
  for (const p of rows) {
    const imgs = JSON.parse(p.images);
    console.log(`\n  ${p.team.name} :: ${p.name}`);
    console.log(`  #images = ${imgs.length}`);
    imgs.slice(0, 4).forEach((u, i) => {
      // Shorten URL to last 60 chars for readability
      const short = u.length > 70 ? "…" + u.slice(-68) : u;
      console.log(`    [${i}] ${short}`);
    });
  }
}

await prisma.$disconnect();
