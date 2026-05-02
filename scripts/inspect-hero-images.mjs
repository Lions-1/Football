/**
 * Inspect all 8 images for each of the 4 hero products so we can pick
 * a front-facing photo (not the collage cover / back of jersey).
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Same 4 teams we pinned in HERO_JERSEYS — find their best-scoring
// 2026/27 home jersey with a full 8-image array.
const TARGETS = [
  { slug: "real-madrid",       name: "Real Madrid" },
  { slug: "fc-barcelona",      name: "FC Barcelona" },
  { slug: "manchester-united", name: "Manchester United" },
  { slug: "brazil",            name: "Brazil" },
];

function score(name) {
  const n = name.toLowerCase();
  let s = 0;
  if (/2026.?27|26.?27/.test(n)) s += 50;
  if (/2025.?26|25.?26/.test(n)) s += 30;
  if (/\bhome\b/.test(n)) s += 15;
  if (/player.{0,15}(edition|version)/.test(n)) s += 8;
  if (/women|long.{0,3}sleeve|kids|youth|goalkeeper|gk|retro|special/.test(n)) s -= 50;
  return s;
}

for (const t of TARGETS) {
  const products = await p.product.findMany({
    where: {
      team: { slug: t.slug },
      images: { contains: "/api/img/wanfing/" },
    },
  });
  const ranked = products
    .map(pr => ({ pr, s: score(pr.name) }))
    .sort((a, b) => b.s - a.s);
  const best = ranked[0]?.pr;
  if (!best) { console.log(`${t.name}: no product found`); continue; }

  const imgs = JSON.parse(best.images);
  console.log(`\n=== ${t.name} — ${best.name} ===`);
  console.log(`   slug: ${best.slug}`);
  imgs.forEach((u, i) => console.log(`   [${i}] ${u}`));
}

await p.$disconnect();
