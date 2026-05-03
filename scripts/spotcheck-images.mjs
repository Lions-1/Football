/**
 * Pick one freshly seeded product per league and HEAD-check its first image URL
 * so we know Shopify CDN is actually serving them.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const samples = await prisma.product.findMany({
  where: { team: { league: { slug: { in: ["nba", "national-teams"] } } } },
  orderBy: { createdAt: "desc" },
  take: 10,
  include: { team: { select: { name: true, slug: true } } },
});

for (const p of samples) {
  const imgs = JSON.parse(p.images);
  if (!imgs.length) continue;
  const res = await fetch(imgs[0], { method: "HEAD" });
  console.log(
    `${res.ok ? "OK " : "FAIL "}${String(res.status).padEnd(4)} ${p.team.slug.padEnd(24)} ${imgs[0].substring(0, 90)}`,
  );
}
await prisma.$disconnect();
