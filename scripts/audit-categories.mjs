/**
 * Show every distinct value of `Product.category` and how many products
 * use it. Helps us see why the Training / Tracksuits / Shorts menu items
 * appear empty (likely category strings don't match).
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const rows = await p.product.groupBy({
  by: ["category"],
  _count: { _all: true },
  orderBy: { _count: { category: "desc" } },
});

console.log("DB category counts:");
for (const r of rows) {
  console.log(`  ${(r.category || "<null>").padEnd(20)} ${r._count._all}`);
}

const total = rows.reduce((a, r) => a + r._count._all, 0);
console.log(`\nTotal products: ${total}`);

await p.$disconnect();
