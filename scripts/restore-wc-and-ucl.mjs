/**
 * Restore pieces we over-deleted:
 *   1. Champions League league record (route /league/champions-league
 *      aggregates across CHAMPIONS_LEAGUE_CLUBS, but the league row itself
 *      needs to exist for the dynamic route to not return 404).
 *   2. The 35 empty national teams (so World Cup 2026 page shows every flag,
 *      not just Brazil). Products will follow as we source more Yupoo albums.
 * Uses the backup JSONs written by cleanup-empty-entities.mjs.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
const p = new PrismaClient();

// ── 1. Champions League ───────────────────────────────────────────────
const leaguesBackup = JSON.parse(
  fs.readFileSync("scripts/backup-empty-leagues-2026-05-02.json", "utf8")
);
const uclBackup = leaguesBackup.find(l => l.slug === "champions-league");

if (uclBackup) {
  const existing = await p.league.findUnique({ where: { slug: "champions-league" } });
  if (existing) {
    console.log(`champions-league already present (id: ${existing.id})`);
  } else {
    await p.league.create({
      data: {
        id: uclBackup.id,
        name: uclBackup.name,
        slug: uclBackup.slug,
        order: 25, // surface it near the top of league listings
      },
    });
    console.log(`Restored league: ${uclBackup.slug}`);
  }
}

// ── 2. National teams ─────────────────────────────────────────────────
const teamsBackup = JSON.parse(
  fs.readFileSync("scripts/backup-empty-teams-2026-05-02.json", "utf8")
);
const nationalTeams = teamsBackup.filter(t => t.league.slug === "national-teams");
console.log(`\nNational teams in backup: ${nationalTeams.length}`);

// Verify the national-teams league still exists
const ntLeague = await p.league.findUnique({ where: { slug: "national-teams" } });
if (!ntLeague) {
  console.log("ERROR: national-teams league missing from DB — aborting restore");
  process.exit(1);
}

let restored = 0;
let skipped = 0;
for (const t of nationalTeams) {
  const existing = await p.team.findUnique({ where: { slug: t.slug } });
  if (existing) { skipped++; continue; }
  await p.team.create({
    data: {
      id: t.id,
      name: t.name,
      slug: t.slug,
      logo: t.logo,
      leagueId: ntLeague.id,
    },
  });
  restored++;
}
console.log(`  restored: ${restored}   already-present: ${skipped}`);

// Final state
const [leagues, teams, products] = await Promise.all([
  p.league.count(),
  p.team.count(),
  p.product.count(),
]);
console.log(`\nFinal state:  ${leagues} leagues · ${teams} teams · ${products} products`);

const ntCount = await p.team.count({ where: { league: { slug: "national-teams" } } });
console.log(`  national-teams now has ${ntCount} teams (was 1, expect 36)`);

await p.$disconnect();
