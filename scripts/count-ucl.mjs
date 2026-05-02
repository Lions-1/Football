import { PrismaClient } from "@prisma/client";
import { CHAMPIONS_LEAGUE_CLUBS } from "../src/lib/leagues-data.ts";
const p = new PrismaClient();

const c = await p.product.count({
  where: {
    team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } },
    OR: [
      { name: { contains: "25/26" } },
      { name: { contains: "2025/26" } },
      { name: { contains: "26/27" } },
      { name: { contains: "2026/27" } },
      { name: { contains: "25-26" } },
      { name: { contains: "26-27" } },
    ],
  },
});
console.log(`UCL products (25/26 + 26/27 by name): ${c}`);

const total = await p.product.count({
  where: { team: { slug: { in: CHAMPIONS_LEAGUE_CLUBS } } },
});
console.log(`UCL total products (any season): ${total}`);

await p.$disconnect();
