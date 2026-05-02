/**
 * Audit homepage section queries after the cleanup to see if any will
 * render empty or thin.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// WC2026 countries (copied from page.tsx COUNTRY_FLAGS)
const WC_SLUGS = [
  "morocco","argentina","brazil","france","spain","portugal","germany",
  "england","italy","netherlands","croatia","belgium","uruguay","mexico",
  "usa","canada","japan","south-korea","senegal","cameroon","colombia",
  "denmark","switzerland","algeria","tunisia","ivory-coast","nigeria",
  "ghana","poland","ecuador","australia","egypt","chile","peru","serbia","ukraine"
];

// UCL clubs (copied from page.tsx CHAMPIONS_LEAGUE_CLUBS)
const UCL_SLUGS = [
  "real-madrid","fc-barcelona","atletico-madrid","manchester-city","arsenal",
  "liverpool","chelsea","manchester-united","tottenham","bayern-munich",
  "borussia-dortmund","bayer-leverkusen","rb-leipzig","inter-milan","ac-milan",
  "juventus","napoli","as-roma","paris-saint-germain","olympique-marseille",
  "lyon","benfica","porto","sporting","ajax","psv","celtic","rangers","galatasaray"
];

// Each section's query count
const wc = await p.product.count({
  where: {
    team: { slug: { in: WC_SLUGS }, league: { slug: "national-teams" } },
    images: { not: "[]" },
  },
});
const morocco = await p.product.count({
  where: { team: { slug: "morocco" }, images: { not: "[]" } },
});
const ucl = await p.product.count({
  where: {
    team: { slug: { in: UCL_SLUGS } },
    images: { not: "[]" },
  },
});
const nba = await p.product.count({
  where: { team: { league: { slug: "nba" } }, images: { not: "[]" } },
});

console.log(`WC2026 pool:  ${wc} products`);
console.log(`  Morocco:    ${morocco} products`);
console.log(`UCL pool:     ${ucl} products`);
console.log(`NBA pool:     ${nba} products`);

// Per-league summary
const leagues = await p.league.findMany({
  include: { _count: { select: { teams: true } } },
  orderBy: { order: "asc" },
});
console.log(`\nPer league:`);
for (const l of leagues) {
  const prodCount = await p.product.count({ where: { team: { leagueId: l.id } } });
  console.log(`  ${l.slug.padEnd(22)} ${l._count.teams.toString().padStart(3)} teams, ${prodCount.toString().padStart(3)} products`);
}

// Teams with 0 products (will look broken if visible)
const emptyTeams = await p.team.findMany({
  where: { products: { none: {} } },
  include: { league: true },
});
console.log(`\nEmpty teams (0 products): ${emptyTeams.length}`);
const byLeague = {};
for (const t of emptyTeams) {
  byLeague[t.league.slug] = (byLeague[t.league.slug] || 0) + 1;
}
for (const [lg, n] of Object.entries(byLeague).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${lg.padEnd(22)} ${n} empty teams`);
}

await p.$disconnect();
