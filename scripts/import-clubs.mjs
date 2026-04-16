/**
 * Imports European club products from pulsesfootball.com into our DB.
 * Maps club names to our existing team slugs and creates products with real CDN images.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "https://pulsesfootball.com";

// Map club keywords in handle → our team slug (must match DB team.slug exactly)
const CLUB_MAP = {
  "manchester-united": "manchester-united",
  "manchester-city": "manchester-city",
  "barcelona": "fc-barcelona",
  "real-madrid": "real-madrid",
  "arsenal": "arsenal",
  "chelsea": "chelsea",
  "ac-milan": "ac-milan",
  "atletico-madrid": "atletico-madrid",
  "inter-milan": "inter-milan",
  "real-betis": "real-betis",
  "liverpool": "liverpool",
  "juventus": "juventus",
  "psg": "paris-saint-germain",
  "paris-saint-germain": "paris-saint-germain",
  "bayern": "bayern-munich",
  "borussia-dortmund": "borussia-dortmund",
  "dortmund": "borussia-dortmund",
  "bayer-leverkusen": "bayer-leverkusen",
  "leverkusen": "bayer-leverkusen",
  "napoli": "napoli",
  "tottenham": "tottenham",
  "newcastle": "newcastle-united",
  "ajax": "ajax",
  "benfica": "benfica",
  "porto": "porto",
  "sporting": "sporting-cp",
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

  // Per-club search fallback: any UCL club still missing → hit Shopify search
  const uclSlugs = [
    "real-madrid", "fc-barcelona", "manchester-city", "bayern-munich",
    "paris-saint-germain", "arsenal", "ac-milan", "inter-milan",
    "borussia-dortmund", "bayer-leverkusen", "liverpool", "atletico-madrid",
    "chelsea", "juventus", "napoli", "tottenham",
  ];
  const searchTermFor = {
    "fc-barcelona": "barcelona",
    "paris-saint-germain": "psg",
    "bayern-munich": "bayern munich",
    "borussia-dortmund": "dortmund",
    "bayer-leverkusen": "leverkusen",
    "inter-milan": "inter milan",
    "ac-milan": "ac milan",
    "atletico-madrid": "atletico madrid",
    "manchester-city": "manchester city",
    "manchester-united": "manchester united",
    "real-madrid": "real madrid",
    "liverpool": "liverpool",
    "arsenal": "arsenal",
    "chelsea": "chelsea",
    "juventus": "juventus",
    "napoli": "napoli",
    "tottenham": "tottenham",
  };

  console.log("\n── Per-club search fallback ──");
  for (const slug of uclSlugs) {
    if (teamImageMap[slug]) continue; // already have images from collection
    const q = searchTermFor[slug] || slug.replace(/-/g, " ");
    const url = `${BASE}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const prods = data?.resources?.results?.products || [];
      // Find first home/fan jersey (prefer non-retro, non-long-sleeve)
      const chosen = prods.find(p => {
        const h = (p.handle || "").toLowerCase();
        const t = (p.title || "").toLowerCase();
        if (h.includes("kids") || h.includes("women") || h.includes("long-sleeve")) return false;
        if (h.includes("retro") || h.includes("reissue")) return false;
        return (t.includes("home") || t.includes("25/26") || t.includes("2025")) && p.featured_image?.url;
      }) || prods.find(p => p.featured_image?.url);
      if (!chosen) { console.log(`  ${slug}: no search results`); continue; }

      // Fetch full product for multiple images
      const detail = await fetch(`${BASE}/products/${chosen.handle}.json`);
      let imgs = [chosen.featured_image.url];
      if (detail.ok) {
        const dj = await detail.json();
        const full = dj?.product?.images || [];
        const picked = full
          .filter(i => {
            const s = (i.src || "").toLowerCase();
            return !s.includes("banner") && !s.includes("descricao") && !s.includes("small_");
          })
          .slice(0, 3)
          .map(i => i.src);
        if (picked.length > 0) imgs = picked;
      }
      teamImageMap[slug] = imgs;
      console.log(`  ${slug}: found via search "${q}" → ${chosen.title} (${imgs.length} imgs)`);
    } catch (e) {
      console.log(`  ${slug}: search error ${e.message}`);
    }
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
