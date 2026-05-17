/**
 * One-shot database refactor for the Nov-2026 site overhaul.
 *
 * Wipes ALL products / orders / wishlist items, drops every league and
 * team that isn't part of the new 8-bucket model, then re-seeds the 7
 * canonical leagues (Premier League, La Liga, Serie A, Bundesliga,
 * Ligue 1, Champions League, National Teams) with their default
 * team rosters so the admin "+ Product" form has the dropdown
 * pre-populated.
 *
 * Champions League is intentionally seeded WITHOUT teams — the
 * /league/champions-league page is a virtual view over CHAMPIONS_LEAGUE_CLUBS
 * which resolves clubs from their domestic leagues by slug.
 *
 * Run with `--yes` to actually execute. Without it, prints a dry-run plan.
 *
 *   node scripts/refactor-database.mjs            # dry-run
 *   node scripts/refactor-database.mjs --yes      # destructive
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--yes");

// Mirror of src/lib/leagues-data.ts → LEAGUES_DATA. Kept inline so this
// .mjs script doesn't need to compile TypeScript.
const LEAGUES_DATA = [
  {
    name: "Premier League",
    slug: "premier-league",
    order: 1,
    teams: [
      "Manchester United", "Manchester City", "Arsenal", "Chelsea", "Liverpool",
      "Newcastle United", "Tottenham", "Aston Villa", "Brighton", "Everton",
      "West Ham", "Fulham", "Bournemouth", "Crystal Palace", "Nottingham Forest",
      "Brentford", "Wolverhampton", "Leicester City", "Leeds United", "Burnley",
    ],
  },
  {
    name: "La Liga",
    slug: "la-liga",
    order: 2,
    teams: [
      "Real Madrid", "FC Barcelona", "Atletico Madrid", "Real Betis", "Valencia",
      "Villarreal", "Real Sociedad", "Sevilla", "Celta Vigo", "Girona",
      "Espanyol", "Osasuna", "Rayo Vallecano", "Deportivo Alaves", "Granada",
    ],
  },
  {
    name: "Serie A",
    slug: "serie-a",
    order: 3,
    teams: [
      "Inter Milan", "AC Milan", "Napoli", "Juventus", "AS Roma",
      "Lazio", "Fiorentina", "Atalanta", "Bologna", "Torino",
      "Venezia", "Como", "Parma", "Genoa", "Cagliari",
    ],
  },
  {
    name: "Bundesliga",
    slug: "bundesliga",
    order: 4,
    teams: [
      "Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig",
      "Eintracht Frankfurt", "Wolfsburg", "Stuttgart", "Borussia Monchengladbach",
      "Freiburg", "Union Berlin", "Schalke 04", "Werder Bremen",
    ],
  },
  {
    name: "Ligue 1",
    slug: "ligue-1",
    order: 5,
    teams: [
      "Paris Saint-Germain", "Olympique Marseille", "Lyon", "Lille", "Lens",
      "AS Monaco", "Nice", "Rennes", "Strasbourg", "Toulouse", "Brest",
    ],
  },
  {
    // Virtual league — page resolves teams via CHAMPIONS_LEAGUE_CLUBS by slug.
    name: "Champions League",
    slug: "champions-league",
    order: 6,
    teams: [],
  },
  {
    name: "National Teams",
    slug: "national-teams",
    order: 7,
    teams: ["Morocco"],
  },
];

const KEEP_LEAGUE_SLUGS = LEAGUES_DATA.map((l) => l.slug);

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tag(label) {
  return DRY_RUN ? `[dry-run] ${label}` : label;
}

async function main() {
  console.log("─".repeat(72));
  console.log(DRY_RUN ? "DRY RUN — pass --yes to actually execute" : "EXECUTING (destructive)");
  console.log("─".repeat(72));

  // ── Snapshot of the current database ───────────────────────────────────
  const [
    productCount,
    orderItemCount,
    orderCount,
    wishlistCount,
    teamCount,
    leagueCount,
    leagues,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.orderItem.count(),
    prisma.order.count(),
    prisma.wishlistItem.count(),
    prisma.team.count(),
    prisma.league.count(),
    prisma.league.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { teams: true } } },
    }),
  ]);

  console.log("\nCurrent state:");
  console.log(`  ${productCount.toString().padStart(5)} products`);
  console.log(`  ${orderItemCount.toString().padStart(5)} order items`);
  console.log(`  ${orderCount.toString().padStart(5)} orders`);
  console.log(`  ${wishlistCount.toString().padStart(5)} wishlist items`);
  console.log(`  ${teamCount.toString().padStart(5)} teams`);
  console.log(`  ${leagueCount.toString().padStart(5)} leagues:`);
  for (const l of leagues) {
    const keep = KEEP_LEAGUE_SLUGS.includes(l.slug);
    console.log(`        ${keep ? "✓" : "✗"} ${l.slug.padEnd(22)} (${l._count.teams} teams)`);
  }

  // ── Plan summary ───────────────────────────────────────────────────────
  const dropLeagues = leagues.filter((l) => !KEEP_LEAGUE_SLUGS.includes(l.slug));
  const teamsToSeed = LEAGUES_DATA.reduce((sum, l) => sum + l.teams.length, 0);

  console.log("\nPlan:");
  console.log(`  • Wipe ALL products (${productCount}), orders (${orderCount}), order items (${orderItemCount}), wishlist items (${wishlistCount})`);
  console.log(`  • Wipe ALL teams (${teamCount}) — every team is reseeded from scratch`);
  console.log(`  • Drop ${dropLeagues.length} dead league(s): ${dropLeagues.map((l) => l.slug).join(", ") || "(none)"}`);
  console.log(`  • Upsert ${KEEP_LEAGUE_SLUGS.length} canonical leagues with order/slug normalised`);
  console.log(`  • Seed ${teamsToSeed} default teams across the kept leagues (UCL stays virtual, 0 teams)`);

  if (DRY_RUN) {
    console.log("\n→ Dry-run. Re-run with --yes to apply.\n");
    return;
  }

  // ── Destructive section, in dependency order ───────────────────────────
  console.log("\n" + tag("Wiping data…"));

  // WishlistItem first (no dependents)
  const wDel = await prisma.wishlistItem.deleteMany();
  console.log(`  · wishlist items deleted: ${wDel.count}`);

  // OrderItem before Order (FK orderId)
  const oiDel = await prisma.orderItem.deleteMany();
  console.log(`  · order items deleted:    ${oiDel.count}`);

  const oDel = await prisma.order.deleteMany();
  console.log(`  · orders deleted:         ${oDel.count}`);

  // Product before Team (FK teamId)
  const pDel = await prisma.product.deleteMany();
  console.log(`  · products deleted:       ${pDel.count}`);

  // Team before League (FK leagueId, but cascade is on so this also handles it)
  const tDel = await prisma.team.deleteMany();
  console.log(`  · teams deleted:          ${tDel.count}`);

  // Drop leagues not in keep-list
  const lDel = await prisma.league.deleteMany({
    where: { slug: { notIn: KEEP_LEAGUE_SLUGS } },
  });
  console.log(`  · dead leagues deleted:   ${lDel.count}`);

  // ── Upsert canonical leagues ───────────────────────────────────────────
  console.log("\n" + tag("Upserting canonical leagues…"));
  for (const league of LEAGUES_DATA) {
    await prisma.league.upsert({
      where: { slug: league.slug },
      create: { slug: league.slug, name: league.name, order: league.order },
      update: { name: league.name, order: league.order },
    });
    console.log(`  · ${league.slug.padEnd(22)} ✓`);
  }

  // ── Seed teams ─────────────────────────────────────────────────────────
  console.log("\n" + tag("Seeding teams…"));
  let totalTeams = 0;
  for (const league of LEAGUES_DATA) {
    if (league.teams.length === 0) {
      console.log(`  · ${league.slug.padEnd(22)} (skipped — virtual or empty)`);
      continue;
    }
    const leagueRow = await prisma.league.findUnique({ where: { slug: league.slug } });
    if (!leagueRow) throw new Error(`league row missing after upsert: ${league.slug}`);

    let added = 0;
    for (const teamName of league.teams) {
      const slug = slugify(teamName);
      // upsert so re-runs are idempotent and slug uniqueness is preserved
      await prisma.team.upsert({
        where: { slug },
        create: { slug, name: teamName, leagueId: leagueRow.id },
        update: { name: teamName, leagueId: leagueRow.id },
      });
      added += 1;
    }
    totalTeams += added;
    console.log(`  · ${league.slug.padEnd(22)} +${added} teams`);
  }

  // ── Final state ────────────────────────────────────────────────────────
  const [finalProducts, finalTeams, finalLeagues] = await Promise.all([
    prisma.product.count(),
    prisma.team.count(),
    prisma.league.count(),
  ]);

  console.log("\nFinal state:");
  console.log(`  ${finalProducts.toString().padStart(5)} products`);
  console.log(`  ${finalTeams.toString().padStart(5)} teams (seeded ${totalTeams})`);
  console.log(`  ${finalLeagues.toString().padStart(5)} leagues`);
  console.log("\n✓ Refactor complete.\n");
}

main()
  .catch((err) => {
    console.error("\n✗ Refactor failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
