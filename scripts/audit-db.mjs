import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ucl = await prisma.league.findUnique({
  where: { slug: "champions-league" },
  include: { teams: { include: { _count: { select: { products: true } } } } },
});
console.log("\n=== Champions League teams ===");
if (ucl) {
  for (const t of ucl.teams) {
    console.log(`  ${t.slug.padEnd(28)} products=${t._count.products}`);
  }
} else {
  console.log("  (champions-league league not found)");
}

const nt = await prisma.league.findUnique({
  where: { slug: "national-teams" },
  include: { teams: { include: { products: true } } },
});
console.log("\n=== National Teams: placeholder/seed detection ===");
if (nt) {
  let totalSeed = 0;
  for (const t of nt.teams) {
    const seedProds = t.products.filter(p => /X (Adidas|Nike|Puma|Kappa)/.test(p.name));
    const realProds = t.products.filter(p => !/X (Adidas|Nike|Puma|Kappa)/.test(p.name));
    if (seedProds.length > 0 || realProds.length > 0) {
      console.log(`  ${t.slug.padEnd(20)} total=${t.products.length}  seed=${seedProds.length}  real=${realProds.length}`);
    }
    totalSeed += seedProds.length;
  }
  console.log(`\n  TOTAL SEED PLACEHOLDERS: ${totalSeed}`);
}

// Top clubs in other leagues — where do the UCL club slugs currently live?
console.log("\n=== Where UCL clubs currently live ===");
const uclSlugs = [
  "real-madrid","fc-barcelona","manchester-city","bayern-munich","paris-saint-germain",
  "arsenal","ac-milan","inter-milan","borussia-dortmund","bayer-leverkusen","liverpool",
  "atletico-madrid","chelsea","juventus","porto","benfica","ajax","napoli"
];
for (const slug of uclSlugs) {
  const team = await prisma.team.findUnique({
    where: { slug },
    include: { league: true, _count: { select: { products: true } } },
  });
  if (team) {
    console.log(`  ${slug.padEnd(22)} league=${team.league.slug.padEnd(18)} products=${team._count.products}`);
  } else {
    console.log(`  ${slug.padEnd(22)} NOT FOUND`);
  }
}

await prisma.$disconnect();
