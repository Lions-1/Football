import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CHAMPIONS_LEAGUE_CLUBS = [
  "real-madrid","fc-barcelona","manchester-united","manchester-city","liverpool",
  "arsenal","chelsea","tottenham-hotspur","bayern-munich","borussia-dortmund",
  "paris-saint-germain","olympique-de-marseille","juventus","inter-milan","ac-milan",
  "atletico-madrid","ajax","benfica",
];

const filter = {
  team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } },
  OR: [
    { season: { contains: "26/27" } },
    { season: { contains: "2026-27" } },
    { name: { contains: "26/27" } },
    { name: { contains: "2026/27" } },
    { name: { contains: "26-27" } },
  ],
};

const total = await prisma.product.count({
  where: { team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } } },
});
const current = await prisma.product.count({ where: filter });
const sample = await prisma.product.findMany({
  where: filter,
  select: { name: true, season: true, team: { select: { slug: true } } },
  take: 8,
});

console.log(`Total UCL club products in DB: ${total}`);
console.log(`Match current-season (26/27) filter: ${current}`);
console.log("Sample:");
for (const p of sample) console.log(` - [${p.team.slug}] ${p.name}  (season=${p.season})`);

// What seasons exist?
const seasons = await prisma.product.groupBy({
  by: ["season"],
  where: { team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } } },
  _count: { _all: true },
  orderBy: { _count: { id: "desc" } },
});
console.log("\nSeasons in UCL products:");
for (const s of seasons) console.log(`  ${s.season || "(null)"}: ${s._count._all}`);

await prisma.$disconnect();
