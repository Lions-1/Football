// Deletes the pre-catalog products listed in the 2026-10-02 backup, EXCEPT any
// product still referenced by an order (order history is never deleted here).
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
const APPLY = process.argv.includes("--apply");
const p = new PrismaClient();
const backup = JSON.parse(fs.readFileSync("scripts/catalog/work/backup-site-products-2026-10-02.json", "utf8"));
const ids = backup.map((b) => b.id);
const ordered = new Set((await p.orderItem.findMany({ where: { productId: { in: ids } }, select: { productId: true } })).map((o) => o.productId));
const toDelete = ids.filter((id) => !ordered.has(id));
console.log(`backup: ${ids.length} | kept (referenced by an order): ${ordered.size} | to delete: ${toDelete.length}`);
for (const id of ordered) console.log("  kept:", backup.find((b) => b.id === id).name);
if (APPLY) {
  const r = await p.product.deleteMany({ where: { id: { in: toDelete } } });
  console.log(`DELETED ${r.count} products. Remaining total: ${await p.product.count()}`);
} else console.log("DRY RUN — add --apply");
await p.$disconnect();
