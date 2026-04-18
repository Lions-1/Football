import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const nt = await prisma.league.findUnique({
  where: { slug: "national-teams" },
  include: {
    teams: {
      orderBy: { name: "asc" },
      include: { products: true },
    },
  },
});

function isReal(u) { return typeof u === "string" && (u.includes("cdn.shopify.com") || u.includes("pulsesfootball") || /\.(png|jpe?g|webp)(\?|$)/i.test(u)); }
function hasReal(p) { try { return JSON.parse(p.images).some(isReal); } catch { return false; } }

const empty = [];
const low = [];
const ok = [];
let total = 0;

for (const t of nt.teams) {
  const real = t.products.filter(hasReal);
  total += real.length;
  const row = { slug: t.slug, name: t.name, total: t.products.length, real: real.length };
  if (real.length === 0) empty.push(row);
  else if (real.length < 3) low.push(row);
  else ok.push(row);
}

console.log("=== WC country coverage ===");
console.log(`\nEMPTY (${empty.length}):`);
for (const r of empty) console.log(`  ${r.slug.padEnd(22)} total=${r.total.toString().padStart(2)}  real=${r.real}`);
console.log(`\nLOW (<3 real, ${low.length}):`);
for (const r of low) console.log(`  ${r.slug.padEnd(22)} total=${r.total.toString().padStart(2)}  real=${r.real}`);
console.log(`\nOK (${ok.length}):`);
for (const r of ok) console.log(`  ${r.slug.padEnd(22)} total=${r.total.toString().padStart(2)}  real=${r.real}`);
console.log(`\nTotal real products: ${total}`);

await prisma.$disconnect();
