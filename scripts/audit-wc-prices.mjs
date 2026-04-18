import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const prods = await prisma.product.findMany({
  where: { team: { league: { slug: "national-teams" } }, images: { contains: "cdn.shopify.com" } },
  select: { price: true, name: true },
  take: 15,
  orderBy: { createdAt: "desc" },
});
for (const r of prods) console.log(r.price.toString().padStart(4), "MAD |", r.name.slice(0, 80));
await prisma.$disconnect();
