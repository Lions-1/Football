import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const leagues = await p.league.findMany({ include: { _count: { select: { teams: true } } }, orderBy: { order: "asc" } });
console.log("Leagues:");
for (const l of leagues) console.log(`  ${l.slug.padEnd(28)} (${l._count.teams} teams)`);

// Specific lookups
console.log("\nNBA league:", await p.league.findUnique({ where: { slug: "nba" } }) ? "exists" : "MISSING");

// Check teams that should match common aliases
const testSlugs = ["inter-milan", "as-roma", "psg", "paris-saint-germain", "az-alkmaar", "celtic", "rangers", "olimpia", "philadelphia-union", "portland-timbers", "fc-cincinnati", "vasco-da-gama"];
console.log("\nKey team lookups:");
for (const s of testSlugs) {
  const t = await p.team.findUnique({ where: { slug: s } });
  console.log(`  ${s.padEnd(26)} ${t ? `→ "${t.name}"` : "(missing)"}`);
}

await p.$disconnect();
