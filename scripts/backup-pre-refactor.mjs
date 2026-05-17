/**
 * Snapshot of the production database immediately before the
 * Nov-2026 site refactor wipe. Dumps every league, team and product
 * (with their relations resolved) to a single JSON file so old data
 * can be grepped, partially restored, or audited after the wipe.
 *
 *   node scripts/backup-pre-refactor.mjs
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const prisma = new PrismaClient();

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const out = `scripts/backup-pre-refactor-${todayStamp()}.json`;
  console.log(`Snapshotting database → ${out}\n`);

  const [leagues, teams, products, orders] = await Promise.all([
    prisma.league.findMany({ orderBy: { order: "asc" } }),
    prisma.team.findMany({
      orderBy: [{ leagueId: "asc" }, { name: "asc" }],
      include: { league: { select: { slug: true, name: true } } },
    }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        team: { include: { league: { select: { slug: true, name: true } } } },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
  ]);

  const payload = {
    snapshot_at: new Date().toISOString(),
    counts: {
      leagues: leagues.length,
      teams: teams.length,
      products: products.length,
      orders: orders.length,
    },
    leagues,
    teams,
    products,
    orders,
  };

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");

  const sizeKb = (Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(1);
  console.log(`✓ Saved ${out}`);
  console.log(`  ${leagues.length} leagues · ${teams.length} teams · ${products.length} products · ${orders.length} orders`);
  console.log(`  ${sizeKb} KB\n`);
}

main()
  .catch((err) => {
    console.error("✗ Backup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
