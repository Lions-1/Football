/**
 * Spot-check xingkong-sourced NBA products: print 12 sample names so we
 * can eyeball the translation quality, and HEAD-check a few image URLs
 * through the local /api/img proxy.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const samples = await p.product.findMany({
  where: {
    slug: { startsWith: "xingkong-" },
  },
  take: 14,
  orderBy: { createdAt: "desc" },
  include: { team: { select: { slug: true, name: true } } },
});

console.log(`\n--- Sample names (${samples.length}) ---`);
for (const s of samples) {
  // Name
  console.log(`[${s.team.name}]  ${s.name}`);
}

console.log(`\n--- Image proxy check ---`);
let okCount = 0;
for (const s of samples.slice(0, 8)) {
  const imgs = JSON.parse(s.images);
  const first = imgs[0];
  if (!first || !first.startsWith("/api/img/")) continue;
  const r = await fetch(`http://localhost:3000${first}`);
  console.log(`${r.status === 200 ? "OK " : "FAIL "}${r.status} ${s.team.slug.padEnd(24)} ${first.substring(0, 75)}`);
  if (r.status === 200) okCount++;
}
console.log(`\n${okCount}/8 images reachable through proxy`);

// Also count any Chinese characters that survived translation
const stillChinese = samples.filter((s) => /[\u4e00-\u9fff]/.test(s.name));
console.log(`\nProducts with leftover Chinese in name: ${stillChinese.length}/${samples.length}`);
if (stillChinese.length > 0) {
  for (const s of stillChinese) console.log(`  ! ${s.name}`);
}

await p.$disconnect();
