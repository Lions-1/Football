/**
 * Audit: count products per team (focused on UCL + F1 + Morocco + WC)
 * Reports which teams are missing products or have empty images.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const UCL_CLUB_SLUGS = [
  "real-madrid", "fc-barcelona", "manchester-city", "bayern-munich",
  "paris-saint-germain", "arsenal", "ac-milan", "inter-milan",
  "borussia-dortmund", "bayer-leverkusen", "liverpool", "atletico-madrid",
];

const F1_SLUGS = [
  "red-bull-racing", "ferrari", "mercedes-amg-f1", "mclaren-f1",
  "alpine-f1", "aston-martin-f1", "williams-f1", "rb-f1",
  "kick-sauber", "haas-f1",
];

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  LEAGUES");
  console.log("═══════════════════════════════════════");
  const leagues = await prisma.league.findMany({ orderBy: { order: "asc" } });
  for (const l of leagues) console.log(`  ${l.slug.padEnd(25)} (${l.name})`);

  console.log("\n═══════════════════════════════════════");
  console.log("  UCL CLUBS");
  console.log("═══════════════════════════════════════");
  for (const slug of UCL_CLUB_SLUGS) {
    const team = await prisma.team.findUnique({
      where: { slug },
      include: { products: true },
    });
    if (!team) { console.log(`  MISSING: ${slug}`); continue; }
    const withImgs = team.products.filter(p => p.images !== "[]").length;
    console.log(`  ${slug.padEnd(25)} total=${team.products.length.toString().padStart(2)} withImgs=${withImgs}`);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  F1 TEAMS");
  console.log("═══════════════════════════════════════");
  for (const slug of F1_SLUGS) {
    const team = await prisma.team.findUnique({
      where: { slug },
      include: { products: true },
    });
    if (!team) { console.log(`  MISSING TEAM: ${slug}`); continue; }
    const withImgs = team.products.filter(p => p.images !== "[]").length;
    console.log(`  ${slug.padEnd(25)} total=${team.products.length.toString().padStart(2)} withImgs=${withImgs}`);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  MOROCCO");
  console.log("═══════════════════════════════════════");
  const morocco = await prisma.team.findUnique({
    where: { slug: "morocco" },
    include: { products: true },
  });
  if (morocco) {
    const withImgs = morocco.products.filter(p => p.images !== "[]");
    console.log(`  morocco: total=${morocco.products.length} withImgs=${withImgs.length}`);
    for (const p of morocco.products) {
      const imgs = JSON.parse(p.images);
      console.log(`    - ${p.name} (${imgs.length} imgs, ${p.surCommande ? "sur-cmd" : "in-stock"})`);
    }
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  NATIONAL TEAMS (WC) — empty only");
  console.log("═══════════════════════════════════════");
  const natLeague = await prisma.league.findUnique({
    where: { slug: "national-teams" },
    include: { teams: { include: { products: true } } },
  });
  if (natLeague) {
    const empties = natLeague.teams.filter(t =>
      t.products.length === 0 || t.products.every(p => p.images === "[]")
    );
    for (const t of empties) console.log(`  EMPTY: ${t.slug} (${t.products.length} products)`);
    console.log(`\n  Total national teams: ${natLeague.teams.length}, empty: ${empties.length}`);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  ALL TEAMS WITH 0 OR ONLY EMPTY PRODUCTS");
  console.log("═══════════════════════════════════════");
  const allTeams = await prisma.team.findMany({
    include: { league: true, products: true },
  });
  const emptyByLeague = {};
  for (const t of allTeams) {
    const hasReal = t.products.some(p => p.images !== "[]");
    if (!hasReal) {
      const key = t.league.slug;
      (emptyByLeague[key] ||= []).push(t.slug);
    }
  }
  for (const [lg, slugs] of Object.entries(emptyByLeague)) {
    console.log(`  [${lg}] ${slugs.length}: ${slugs.slice(0, 10).join(", ")}${slugs.length > 10 ? "..." : ""}`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
