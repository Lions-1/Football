/**
 * Imports European club products from pulsesfootball.com into our DB.
 * Maps club names to our existing team slugs and creates products with real CDN images.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "https://pulsesfootball.com";

// Map club keywords in handle → our team slug
const CLUB_MAP = {
  "manchester-united": "manchester-united",
  "manchester-city": "manchester-city",
  "barcelona": "barcelona",
  "real-madrid": "real-madrid",
  "arsenal": "arsenal",
  "chelsea": "chelsea",
  "ac-milan": "ac-milan",
  "atletico-madrid": "atletico-madrid",
  "inter-milan": "inter-milan",
  "real-betis": "real-betis",
  "liverpool": "liverpool",
  "juventus": "juventus",
  "psg": "psg",
  "bayern": "bayern-munich",
  "borussia-dortmund": "borussia-dortmund",
  "napoli": "napoli",
};

function detectClub(handle) {
  const sorted = Object.keys(CLUB_MAP).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (handle.includes(key)) return CLUB_MAP[key];
  }
  return null;
}

function pickBestImages(images) {
  const dominated = images.filter(img => {
    const src = img.src.toLowerCase();
    if (src.includes("banner")) return false;
    if (src.includes("descricao")) return false;
    if (src.includes("small_")) return false;
    return img.width >= 500;
  });
  const selected = dominated.length > 0 ? dominated : images;
  return selected.slice(0, 3).map(img => img.src);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  // Fetch club products from "The Largest in Europe" collection
  console.log("Fetching European club products...\n");
  let allProducts = [];
  for (let page = 1; page <= 3; page++) {
    const url = `${BASE}/collections/the-largest-in-europe/products.json?page=${page}&limit=250`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (!data.products || data.products.length === 0) break;
    allProducts = allProducts.concat(data.products);
    console.log(`  Page ${page}: ${data.products.length} products`);
  }
  console.log(`\nTotal raw: ${allProducts.length}\n`);

  // Get all teams from DB
  const allTeams = await prisma.team.findMany({ include: { league: true } });
  const teamsBySlug = {};
  for (const t of allTeams) teamsBySlug[t.slug] = t;

  let created = 0, skipped = 0;
  const seenKeys = new Set();

  for (const p of allProducts) {
    const clubSlug = detectClub(p.handle);
    if (!clubSlug) {
      skipped++;
      continue;
    }
    const team = teamsBySlug[clubSlug];
    if (!team) {
      console.log(`  SKIP (no team in DB): ${clubSlug}`);
      skipped++;
      continue;
    }

    // Detect variant
    let variant = "home";
    if (p.handle.includes("away")) variant = "away";
    else if (p.handle.includes("third")) variant = "third";
    else if (p.handle.includes("fourth")) variant = "fourth";
    else if (p.handle.includes("goalkeeper") || p.handle.includes("-gk")) variant = "gk";
    else if (p.handle.includes("special-edition")) variant = "special";
    if (p.handle.includes("player-version")) variant += "-player";

    const key = `${clubSlug}::${variant}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const images = pickBestImages(p.images || []);
    if (images.length === 0) {
      console.log(`  SKIP (no images): ${p.handle}`);
      continue;
    }

    const cleanTitle = p.title.replace(/\s+/g, " ").trim();
    const slug = slugify(cleanTitle);

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      // Update images on existing product
      await prisma.product.update({
        where: { id: existing.id },
        data: { images: JSON.stringify(images) },
      });
      console.log(`  UPDATED: ${cleanTitle}`);
      continue;
    }

    await prisma.product.create({
      data: {
        name: cleanTitle,
        slug,
        price: 199,
        images: JSON.stringify(images),
        sizes: JSON.stringify(p.options?.find(o => o.name === "Size")?.values || ["S", "M", "L", "XL", "XXL"]),
        teamId: team.id,
        category: "jersey",
        season: "2025/26",
        surCommande: true,
        featured: variant === "home",
        bestSeller: ["barcelona", "real-madrid", "manchester-united", "arsenal", "chelsea", "ac-milan"].includes(clubSlug) && variant === "home",
      },
    });
    created++;
    console.log(`  CREATED: ${cleanTitle} (${images.length} imgs)`);
  }

  // Also update existing club products that have empty images
  // with the first image from a scraped product for the same team
  const teamImageMap = {};
  for (const p of allProducts) {
    const clubSlug = detectClub(p.handle);
    if (!clubSlug || teamImageMap[clubSlug]) continue;
    const imgs = pickBestImages(p.images || []);
    if (imgs.length > 0) teamImageMap[clubSlug] = imgs;
  }

  const emptyProducts = await prisma.product.findMany({
    where: { images: "[]" },
    include: { team: true },
  });

  let patched = 0;
  for (const ep of emptyProducts) {
    const imgs = teamImageMap[ep.team.slug];
    if (imgs) {
      await prisma.product.update({
        where: { id: ep.id },
        data: { images: JSON.stringify(imgs) },
      });
      patched++;
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Patched empty: ${patched}`);
  await prisma.$disconnect();
}

main().catch(console.error);
