/**
 * Verify wanfing images load via the local /api/img proxy.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const sample = await p.product.findMany({
  where: { team: { league: { slug: { in: ["national-teams", "nba"] } } } },
  take: 8,
  orderBy: { createdAt: "desc" },
  include: { team: { select: { slug: true } } },
});

for (const x of sample) {
  const imgs = JSON.parse(x.images);
  const first = imgs.find((u) => u.startsWith("/api/img/")) || imgs[0];
  if (!first) continue;
  const r = await fetch(`http://localhost:3000${first}`);
  const len = r.headers.get("content-length") || "?";
  console.log(`${r.status === 200 ? "OK " : "FAIL "}${r.status} ${x.team.slug.padEnd(22)} ${first.substring(0, 70)} (len=${len})`);
}
await p.$disconnect();
