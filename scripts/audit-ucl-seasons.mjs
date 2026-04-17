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

function isReal(u) { return typeof u === "string" && (u.includes("cdn.shopify.com") || u.includes("pulsesfootball")); }

// Current-season detector: title/season contains 2025/26 tokens
function isCurrent(p) {
  const s = (p.season || "").toLowerCase();
  const n = (p.name || "").toLowerCase();
  const hay = `${s} ${n}`;
  return /(25\s*[\/\-]\s*26|2025\s*[\/\-]\s*26|2025-26|2025\/26|25-26|25\/26)/.test(hay);
}

let total = 0, current = 0;
console.log("=== UCL club season audit ===");
for (const slug of UCL) {
  const team = await prisma.team.findUnique({
    where: { slug },
    include: { products: { orderBy: { createdAt: "desc" } } },
  });
  if (!team) continue;
  const withReal = team.products.filter(p => {
    try { return JSON.parse(p.images).some(isReal); } catch { return false; }
  });
  const cur = withReal.filter(isCurrent);
  total += withReal.length;
  current += cur.length;
  const mark = cur.length >= 2 ? "✓" : "✗";
  console.log(`  ${mark} ${slug.padEnd(22)} real=${withReal.length.toString().padStart(2)}  25/26=${cur.length.toString().padStart(2)}`);
  // Sample the non-current titles so we know what older products exist
  const older = withReal.filter(p => !isCurrent(p));
  if (older.length > 0 && cur.length < 2) {
    for (const p of older.slice(0, 3)) console.log(`      older: "${p.name}"  season="${p.season}"`);
  }
}
console.log(`\nTotals: ${current}/${total} products are current-season (25/26)`);

await prisma.$disconnect();
