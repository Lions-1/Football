import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const total = await p.product.count();
const yupoo = await p.product.count({ where: { images: { contains: "photo.yupoo.com" } } });

console.log(`Total products in DB:           ${total}`);
console.log(`With Yupoo images:              ${yupoo}`);
console.log(`Yupoo coverage:                 ${(yupoo/total*100).toFixed(1)}%\n`);

// Per league count of yupoo products
const byLeague = await p.team.findMany({
  include: {
    league: true,
    _count: { select: { products: true } },
  },
});
const leagueStats = new Map();
for (const t of byLeague) {
  const lk = t.league.slug;
  const cur = leagueStats.get(lk) || { name: t.league.name, slug: lk, products: 0, teams: 0 };
  cur.products += t._count.products;
  cur.teams += 1;
  leagueStats.set(lk, cur);
}

console.log("Per league:");
const rows = [...leagueStats.values()].sort((a,b) => b.products - a.products);
for (const l of rows) console.log(`  ${l.slug.padEnd(28)} ${l.teams} teams, ${l.products} products`);

// NBA specifically
console.log("\nNBA products:");
const nba = await p.team.findMany({
  where: { league: { slug: "nba" } },
  include: { products: { select: { name: true, images: true } } },
});
for (const t of nba) {
  if (t.products.length > 0) {
    console.log(`  ${t.slug.padEnd(28)} ${t.products.length} products`);
    for (const pr of t.products) {
      const imgs = JSON.parse(pr.images);
      console.log(`     - ${pr.name.slice(0, 70)} (${imgs.length} imgs)`);
    }
  }
}

// Sample 3 Yupoo products with full image arrays
console.log("\n3 sample Yupoo products:");
const samples = await p.product.findMany({
  where: { images: { contains: "photo.yupoo.com" } },
  include: { team: true },
  take: 3,
});
for (const s of samples) {
  const imgs = JSON.parse(s.images);
  console.log(`  ${s.team.name} - ${s.name}`);
  console.log(`    ${imgs.length} images, first: ${imgs[0]}`);
}

await p.$disconnect();
