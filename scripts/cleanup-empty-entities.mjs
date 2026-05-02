/**
 * Delete empty teams and empty leagues so browsing surfaces only real stock.
 *   - Team with 0 products  → delete  (safe: cascades to nothing essential)
 *   - League with 0 teams   → delete
 * A backup JSON is written first.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
const p = new PrismaClient();

const ts = new Date().toISOString().slice(0, 10);

// 1) empty teams
const emptyTeams = await p.team.findMany({
  where: { products: { none: {} } },
  include: { league: true },
});
console.log(`Empty teams: ${emptyTeams.length}`);

if (emptyTeams.length > 0) {
  fs.writeFileSync(`scripts/backup-empty-teams-${ts}.json`, JSON.stringify(emptyTeams, null, 2));
  const del = await p.team.deleteMany({
    where: { id: { in: emptyTeams.map(t => t.id) } },
  });
  console.log(`  deleted ${del.count} empty teams`);
}

// 2) empty leagues (after team deletions)
const emptyLeagues = await p.league.findMany({
  where: { teams: { none: {} } },
});
console.log(`\nEmpty leagues: ${emptyLeagues.length}`);
console.log(`  ${emptyLeagues.map(l => l.slug).join(", ")}`);

if (emptyLeagues.length > 0) {
  fs.writeFileSync(`scripts/backup-empty-leagues-${ts}.json`, JSON.stringify(emptyLeagues, null, 2));
  const del = await p.league.deleteMany({
    where: { id: { in: emptyLeagues.map(l => l.id) } },
  });
  console.log(`  deleted ${del.count} empty leagues`);
}

// Final state
const [leagues, teams, products] = await Promise.all([
  p.league.count(),
  p.team.count(),
  p.product.count(),
]);
console.log(`\nFinal state:  ${leagues} leagues · ${teams} teams · ${products} products`);

// Per league summary
const byLeague = await p.league.findMany({
  include: { _count: { select: { teams: true } } },
  orderBy: { order: "asc" },
});
for (const l of byLeague) {
  const pc = await p.product.count({ where: { team: { leagueId: l.id } } });
  console.log(`  ${l.slug.padEnd(22)} ${l._count.teams.toString().padStart(3)} teams, ${pc.toString().padStart(3)} products`);
}

await p.$disconnect();
