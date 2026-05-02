/**
 * Restore F1 league + 10 F1 teams + 28 F1 products from backup,
 * plus the 19 deleted NBA teams (NBA had no products to restore — those
 * were already 0 in the non-Yupoo backup).
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
const p = new PrismaClient();

const leaguesBackup = JSON.parse(
  fs.readFileSync("scripts/backup-empty-leagues-2026-05-02.json", "utf8")
);
const teamsBackup = JSON.parse(
  fs.readFileSync("scripts/backup-empty-teams-2026-05-02.json", "utf8")
);
const productsBackup = JSON.parse(
  fs.readFileSync("scripts/backup-non-yupoo-2026-05-02.json", "utf8")
);

// ── 1. F1 league ───────────────────────────────────────────────────
const f1League = leaguesBackup.find(l => l.slug === "f1");
let f1LeagueId = null;
if (f1League) {
  const existing = await p.league.findUnique({ where: { slug: "f1" } });
  if (existing) {
    console.log(`f1 league already present`);
    f1LeagueId = existing.id;
  } else {
    const created = await p.league.create({
      data: { id: f1League.id, name: f1League.name, slug: f1League.slug, order: 30 },
    });
    f1LeagueId = created.id;
    console.log(`Restored league: f1`);
  }
}

// ── 2. F1 teams (10) ───────────────────────────────────────────────
const f1Teams = teamsBackup.filter(t => t.league.slug === "f1");
let f1TeamsRestored = 0;
const teamSlugToId = {};
for (const t of f1Teams) {
  const existing = await p.team.findUnique({ where: { slug: t.slug } });
  if (existing) {
    teamSlugToId[t.slug] = existing.id;
    continue;
  }
  const created = await p.team.create({
    data: { id: t.id, name: t.name, slug: t.slug, logo: t.logo, leagueId: f1LeagueId },
  });
  teamSlugToId[t.slug] = created.id;
  f1TeamsRestored++;
}
console.log(`Restored ${f1TeamsRestored}/${f1Teams.length} F1 teams`);

// ── 3. F1 products (28) ────────────────────────────────────────────
const f1Products = productsBackup.filter(pr => pr.team.league.slug === "f1");
let f1ProductsRestored = 0;
for (const pr of f1Products) {
  const existing = await p.product.findUnique({ where: { slug: pr.slug } });
  if (existing) continue;
  const teamId = teamSlugToId[pr.team.slug];
  if (!teamId) {
    console.log(`  skip ${pr.slug}: team ${pr.team.slug} not found`);
    continue;
  }
  // Strip relation fields and _count before re-creating
  const { team, _count, ...productData } = pr;
  await p.product.create({ data: { ...productData, teamId } });
  f1ProductsRestored++;
}
console.log(`Restored ${f1ProductsRestored}/${f1Products.length} F1 products`);

// ── 4. NBA empty teams (19) ────────────────────────────────────────
const nbaTeams = teamsBackup.filter(t => t.league.slug === "nba");
const nbaLeague = await p.league.findUnique({ where: { slug: "nba" } });
let nbaTeamsRestored = 0;
if (nbaLeague) {
  for (const t of nbaTeams) {
    const existing = await p.team.findUnique({ where: { slug: t.slug } });
    if (existing) continue;
    await p.team.create({
      data: { id: t.id, name: t.name, slug: t.slug, logo: t.logo, leagueId: nbaLeague.id },
    });
    nbaTeamsRestored++;
  }
}
console.log(`Restored ${nbaTeamsRestored}/${nbaTeams.length} NBA teams`);

// Final state
const [leagues, teams, products] = await Promise.all([
  p.league.count(),
  p.team.count(),
  p.product.count(),
]);
console.log(`\nFinal state:  ${leagues} leagues · ${teams} teams · ${products} products`);

const f1Count = await p.product.count({ where: { team: { league: { slug: "f1" } } } });
const nbaTeamCount = await p.team.count({ where: { league: { slug: "nba" } } });
console.log(`  F1 products: ${f1Count}`);
console.log(`  NBA teams:   ${nbaTeamCount}`);

await p.$disconnect();
