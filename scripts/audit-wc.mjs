import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const nat = await prisma.league.findUnique({
    where: { slug: "national-teams" },
    include: {
      teams: {
        include: { products: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!nat) { console.log("No national-teams league"); return; }

  console.log(`Total countries: ${nat.teams.length}\n`);
  for (const t of nat.teams) {
    const withJerseyImgs = t.products.filter(p => {
      const imgs = JSON.parse(p.images || "[]");
      // real jersey image = shopify CDN or similar, not local logo crest
      return imgs.length > 0 && imgs.some(u =>
        u.includes("cdn.shopify.com") || u.includes("pulsesfootball") || u.includes("vamos-kw")
      );
    });
    const withAnyImgs = t.products.filter(p => JSON.parse(p.images || "[]").length > 0);
    const mark = withJerseyImgs.length === 0 ? "✗" : (withJerseyImgs.length >= 2 ? "✓✓" : "✓ ");
    console.log(`  ${mark} ${t.slug.padEnd(18)} total=${t.products.length.toString().padStart(2)} anyImg=${withAnyImgs.length} realJersey=${withJerseyImgs.length}`);
  }

  // Sample images from Morocco vs another country to compare
  console.log("\n── Sample: morocco products ──");
  const ma = nat.teams.find(t => t.slug === "morocco");
  for (const p of (ma?.products || [])) {
    const imgs = JSON.parse(p.images || "[]");
    console.log(`  ${p.name}`);
    imgs.forEach(i => console.log(`    ${i}`));
  }

  console.log("\n── Sample: france products ──");
  const fr = nat.teams.find(t => t.slug === "france");
  for (const p of (fr?.products || [])) {
    const imgs = JSON.parse(p.images || "[]");
    console.log(`  ${p.name}`);
    imgs.forEach(i => console.log(`    ${i}`));
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
