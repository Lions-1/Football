/**
 * Pick the best 4 jerseys from our DB to use as the hero showcase.
 * Criteria: top clubs, current season, real photo, vibrant colors.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const TARGETS = [
  // (slug, optional name keyword)
  { slug: "real-madrid",       hint: "home" },
  { slug: "fc-barcelona",      hint: "home" },
  { slug: "manchester-united", hint: "home" },
  { slug: "brazil",            hint: "home" },
];

function score(name) {
  const n = name.toLowerCase();
  let s = 0;
  if (/2026.?27|26.?27/.test(n)) s += 50;
  if (/2025.?26|25.?26/.test(n)) s += 30;
  if (/\bhome\b/.test(n)) s += 15;
  if (/player.{0,15}(edition|version)/.test(n)) s += 8;
  // Penalize variants
  if (/women|long.{0,3}sleeve|kids|youth|goalkeeper|gk|retro|2020|2021|2022|2023|2024/.test(n)) s -= 50;
  return s;
}

for (const t of TARGETS) {
  const products = await p.product.findMany({
    where: {
      team: { slug: t.slug },
      images: { contains: "photo.yupoo.com" },
    },
    take: 30,
  });
  const ranked = products.map(pr => ({ pr, s: score(pr.name) })).sort((a,b) => b.s - a.s);
  const match = ranked[0]?.pr;
  if (match) {
    const imgs = JSON.parse(match.images);
    console.log(`${t.slug.padEnd(22)} [${ranked[0].s.toString().padStart(3)}] → ${match.name.slice(0, 60)}`);
    console.log(`     ${imgs[0]}`);
  } else {
    console.log(`${t.slug.padEnd(22)} (no Yupoo product)`);
  }
}

await p.$disconnect();
