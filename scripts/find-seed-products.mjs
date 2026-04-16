import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const products = await prisma.product.findMany({ include: { team: true } });
const seedStyle = products.filter(p => / X (Adidas|Nike|Puma|Kappa) /i.test(p.name));

console.log(`Total products: ${products.length}`);
console.log(`Seed-style (X Brand): ${seedStyle.length}`);
for (const p of seedStyle) {
  console.log(`  ${p.team.slug.padEnd(22)} $${p.price}  ${p.name}`);
}

await prisma.$disconnect();
