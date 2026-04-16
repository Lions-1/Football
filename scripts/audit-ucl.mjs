import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const UCL = [
  "real-madrid","fc-barcelona","atletico-madrid",
  "manchester-city","arsenal","liverpool","chelsea",
  "bayern-munich","borussia-dortmund","bayer-leverkusen",
  "paris-saint-germain",
  "ac-milan","inter-milan","juventus","napoli",
  "benfica","porto","ajax",
];

let totalProds = 0;
let realImg = 0;
console.log("=== UCL club product counts ===");
for (const slug of UCL) {
  const team = await prisma.team.findUnique({
    where: { slug },
    include: { products: true },
  });
  if (!team) { console.log(`  ${slug.padEnd(22)} NOT FOUND`); continue; }
  const withReal = team.products.filter(p => {
    try { return JSON.parse(p.images).some(u => typeof u === "string" && (u.includes("cdn.shopify.com") || u.includes("pulsesfootball"))); }
    catch { return false; }
  });
  totalProds += team.products.length;
  realImg += withReal.length;
  const marker = withReal.length >= 3 ? "✓" : "✗";
  console.log(`  ${marker} ${slug.padEnd(22)} total=${team.products.length.toString().padStart(2)}  realImg=${withReal.length.toString().padStart(2)}`);
}
console.log(`\nTotals: ${totalProds} products (${realImg} with real images)`);

await prisma.$disconnect();
