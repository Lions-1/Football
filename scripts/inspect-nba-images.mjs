import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const products = await p.product.findMany({
  where: { team: { league: { slug: "nba" } } },
  include: { team: true },
  orderBy: { createdAt: "asc" },
});

console.log(`NBA products: ${products.length}\n`);
for (const pr of products) {
  const imgs = JSON.parse(pr.images);
  console.log(`=== ${pr.name} [${pr.team.slug}] ===`);
  console.log(`   slug: ${pr.slug}`);
  imgs.forEach((u, i) => console.log(`   [${i}] ${u}`));
  console.log();
}

// Also audit: non-yupoo products with order refs
const orphans = await p.product.findMany({
  where: { NOT: { images: { contains: "/api/img/wanfing/" } } },
  include: { _count: { select: { orderItems: true } } },
});
const withOrders = orphans.filter(o => o._count.orderItems > 0);
console.log(`\n=== Cleanup preview ===`);
console.log(`Non-Yupoo products total:       ${orphans.length}`);
console.log(`  safely deletable (0 orders):  ${orphans.length - withOrders.length}`);
console.log(`  have orders → hide not delete: ${withOrders.length}`);

await p.$disconnect();
