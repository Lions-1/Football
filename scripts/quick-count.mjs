import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const total = await p.product.count();
const nba = await p.product.count({ where: { team: { league: { slug: "nba" } } } });
const wc = await p.product.count({ where: { team: { league: { slug: "national-teams" } } } });
const recent = await p.product.findMany({
  where: { images: { contains: "/api/img/wanfing/" } },
  select: { team: { select: { slug: true } } },
});
const teamsTouched = new Set(recent.map((r) => r.team.slug)).size;
console.log(`total=${total} nba=${nba} wc=${wc} | yupoo-products=${recent.length} across ${teamsTouched} teams`);
await p.$disconnect();
