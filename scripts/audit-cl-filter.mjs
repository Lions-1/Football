// Verifies the exact season filter the CL page uses — how many products it returns.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const UCL = [
  "real-madrid","fc-barcelona","atletico-madrid","manchester-city","arsenal",
  "liverpool","chelsea","bayern-munich","borussia-dortmund","bayer-leverkusen",
  "paris-saint-germain","ac-milan","inter-milan","juventus","napoli",
  "benfica","porto","ajax",
];

const products = await prisma.product.findMany({
  where: {
    team: { slug: { in: UCL } },
    OR: [
      { season: { contains: "25/26" } },
      { season: { contains: "2025-26" } },
      { name:   { contains: "25/26" } },
      { name:   { contains: "2025/26" } },
      { name:   { contains: "25-26" } },
    ],
  },
  include: { team: true },
  orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
  take: 80,
});

console.log(`CL page will render ${products.length} products (25/26 only).`);
const byTeam = new Map();
for (const p of products) byTeam.set(p.team.slug, (byTeam.get(p.team.slug) || 0) + 1);
for (const slug of UCL) console.log(`  ${slug.padEnd(22)} ${byTeam.get(slug) || 0}`);

await prisma.$disconnect();
