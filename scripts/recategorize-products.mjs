/**
 * Re-bucket products into the Training / Shorts / Tracksuit / Long-Sleeve
 * categories based on the product NAME — so the FilterSidebar's category
 * links aren't empty.
 *
 * Only updates rows where the new category is more specific than the
 * current one (jersey is the catch-all that we promote out of).
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const RULES = [
  // [new category, name regex, allowed-current-category regex]
  ["tracksuit",   /\b(tracksuit|track\s?suit|full.?zip(\s+suit)?)\b/i, /^(jersey|jacket|null)?$/i],
  ["training",    /\btraining\b|出场服|训练服|warm.?up\b/i,             /^(jersey|jacket|null)?$/i],
  ["shorts",      /\bshorts\b|swingman shorts/i,                        /^(jersey|null)?$/i],
  ["long-sleeve", /\blong.?sleeves?\b|长袖/i,                            /^(jersey|null)?$/i],
];

const all = await p.product.findMany({
  select: { id: true, name: true, category: true },
});

const updates = [];
for (const prod of all) {
  for (const [newCat, rx, allowedRx] of RULES) {
    if (prod.category === newCat) break;
    if (!rx.test(prod.name)) continue;
    if (!allowedRx.test(prod.category || "null")) continue;
    updates.push({ id: prod.id, from: prod.category, to: newCat, name: prod.name });
    break;
  }
}

console.log(`Will update ${updates.length} products:\n`);
const byTransition = {};
for (const u of updates) {
  const k = `${u.from} -> ${u.to}`;
  byTransition[k] = (byTransition[k] || 0) + 1;
}
for (const [k, n] of Object.entries(byTransition)) console.log(`  ${k.padEnd(28)} ${n}`);

console.log("\nSamples (first 8):");
for (const u of updates.slice(0, 8)) {
  console.log(`  [${u.from} -> ${u.to}] ${u.name.slice(0, 80)}`);
}

let done = 0;
for (const u of updates) {
  await p.product.update({ where: { id: u.id }, data: { category: u.to } });
  done++;
}
console.log(`\nUpdated ${done} products.`);

// Final breakdown
const after = await p.product.groupBy({
  by: ["category"],
  _count: { _all: true },
  orderBy: { _count: { category: "desc" } },
});
console.log("\nFinal category counts:");
for (const r of after) console.log(`  ${(r.category || "<null>").padEnd(20)} ${r._count._all}`);

await p.$disconnect();
