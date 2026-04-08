/**
 * Imports scraped WC2026 products into the local Prisma DB.
 * - Matches products to existing national teams
 * - Creates products with real jersey images from Shopify CDN
 * - All WC2026 non-Morocco products are surCommande=true
 * - Skips products whose team doesn't exist in DB
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  // Read scraped data
  const raw = readFileSync(join(__dirname, "wc2026-products.json"), "utf-8");
  const products = JSON.parse(raw);
  console.log(`Loaded ${products.length} scraped products\n`);

  // Get all national teams from DB
  const nationalLeague = await prisma.league.findFirst({
    where: { slug: "national-teams" },
    include: { teams: true },
  });

  if (!nationalLeague) {
    console.error("No 'national-teams' league found in DB. Run the main seed first.");
    process.exit(1);
  }

  const teamsBySlug = {};
  for (const t of nationalLeague.teams) {
    teamsBySlug[t.slug] = t;
  }
  console.log(`Found ${Object.keys(teamsBySlug).length} national teams in DB\n`);

  // First: update existing products for matching teams with jersey images
  // (replace crest-only images with real jersey photos)
  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const p of products) {
    const team = teamsBySlug[p.team];
    if (!team) {
      console.log(`  SKIP (no team in DB): ${p.team}`);
      skipped++;
      continue;
    }

    // Clean title: remove [Slim Fit] repetitions and excessive text
    let cleanTitle = p.title
      .replace(/\s*\[Slim Fit\]\s*/g, " ")
      .replace(/\s*Player\s*Player\s*/g, " Player ")
      .replace(/\s+/g, " ")
      .trim();

    const slug = slugify(cleanTitle);
    const isMorocco = p.team === "morocco";
    const price = 199; // Our standard price in MAD

    // Check if product already exists
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      // Update images on existing product
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          images: JSON.stringify(p.images),
          surCommande: !isMorocco,
        },
      });
      updated++;
      console.log(`  UPDATED: ${cleanTitle} (${p.images.length} images)`);
      continue;
    }

    // Create new product
    await prisma.product.create({
      data: {
        name: cleanTitle,
        slug,
        price,
        images: JSON.stringify(p.images),
        sizes: JSON.stringify(p.sizes),
        teamId: team.id,
        category: "jersey",
        season: "2025/26",
        surCommande: !isMorocco,
        featured: p.variant === "home", // Home jerseys are featured
        bestSeller: ["brazil", "argentina", "portugal", "germany", "italy", "england", "france"].includes(p.team) && p.variant === "home",
      },
    });
    created++;
    console.log(`  CREATED: ${cleanTitle} (${p.images.length} images)`);
  }

  // Also update any existing WC2026 products that have empty images
  // Replace with the first scraped image for that team
  const teamImageMap = {};
  for (const p of products) {
    if (p.variant === "home" && p.images.length > 0 && !teamImageMap[p.team]) {
      teamImageMap[p.team] = p.images;
    }
  }

  const existingNationals = await prisma.product.findMany({
    where: {
      team: { leagueId: nationalLeague.id },
      images: "[]",
    },
    include: { team: true },
  });

  let patched = 0;
  for (const ep of existingNationals) {
    const imgs = teamImageMap[ep.team.slug];
    if (imgs) {
      await prisma.product.update({
        where: { id: ep.id },
        data: { images: JSON.stringify(imgs) },
      });
      patched++;
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Patched empty: ${patched}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
