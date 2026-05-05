/**
 * Find products whose NAME contains training / tracksuit / shorts keywords
 * but whose CATEGORY is something else. Helps us re-bucket so the menu
 * filters aren't empty.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function find(rxStr, exclude) {
  const all = await p.product.findMany({ select: { id: true, name: true, category: true } });
  const rx = new RegExp(rxStr, "i");
  return all.filter((x) => rx.test(x.name) && (!exclude || !exclude.test(x.category || "")));
}

const training = await find("training|trainer\\b|warm.?up|出场服|训练", /^training$/);
const tracksuit = await find("tracksuit|track\\s?suit|full.?zip|套装", /^tracksuit$/);
const shorts = await find("\\bshorts\\b|swingman shorts|球裤|短裤", /^shorts$/);

console.log(`Training candidates (name match, current cat ≠ training): ${training.length}`);
for (const x of training.slice(0, 5)) console.log(`  [${x.category}] ${x.name}`);

console.log(`\nTracksuit candidates: ${tracksuit.length}`);
for (const x of tracksuit.slice(0, 5)) console.log(`  [${x.category}] ${x.name}`);

console.log(`\nShorts candidates: ${shorts.length}`);
for (const x of shorts.slice(0, 5)) console.log(`  [${x.category}] ${x.name}`);

await p.$disconnect();
