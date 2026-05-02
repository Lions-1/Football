/**
 * Remove every product that didn't come from the Yupoo catalog
 * (i.e. whose images array does NOT reference /api/img/wanfing/).
 *
 * Safety:
 *   - Full backup written to scripts/backup-non-yupoo-<date>.json so the
 *     catalog can be restored if we don't like the result.
 *   - Products still referenced by orders are kept (set inStock=false).
 *     WishlistItem rows cascade-delete automatically per schema.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
const p = new PrismaClient();

const orphans = await p.product.findMany({
  where: { NOT: { images: { contains: "/api/img/wanfing/" } } },
  include: {
    team: { include: { league: true } },
    _count: { select: { orderItems: true } },
  },
});

console.log(`Non-Yupoo products to process: ${orphans.length}`);

// Backup
const ts = new Date().toISOString().slice(0, 10);
const backupFile = `scripts/backup-non-yupoo-${ts}.json`;
fs.writeFileSync(backupFile, JSON.stringify(orphans, null, 2));
console.log(`Backup written: ${backupFile} (${(fs.statSync(backupFile).size / 1024).toFixed(1)} KB)`);

// Partition
const toDelete = orphans.filter(o => o._count.orderItems === 0);
const toHide = orphans.filter(o => o._count.orderItems > 0);

console.log(`  deletable (no orders):          ${toDelete.length}`);
console.log(`  soft-hiding (has orders):       ${toHide.length}`);

// Batch-hide those referenced by orders
if (toHide.length > 0) {
  await p.product.updateMany({
    where: { id: { in: toHide.map(o => o.id) } },
    data: { inStock: false },
  });
  console.log(`  soft-hidden ${toHide.length} products (inStock=false)`);
}

// Batch-delete orphans without orders (wishlist rows cascade)
if (toDelete.length > 0) {
  const del = await p.product.deleteMany({
    where: { id: { in: toDelete.map(o => o.id) } },
  });
  console.log(`  deleted ${del.count} products`);
}

// Final state
const [totalAfter, yupooAfter, hiddenAfter] = await Promise.all([
  p.product.count(),
  p.product.count({ where: { images: { contains: "/api/img/wanfing/" } } }),
  p.product.count({ where: { inStock: false } }),
]);
console.log(`\nFinal state:`);
console.log(`  total products:                 ${totalAfter}`);
console.log(`  yupoo products:                 ${yupooAfter}`);
console.log(`  hidden (inStock=false):         ${hiddenAfter}`);

await p.$disconnect();
