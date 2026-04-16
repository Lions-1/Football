/**
 * Scrapes real F1 team jackets/hoodies/bombers from fueler.store (Shopify).
 * Replaces the previous car-photo F1 products with actual F1 merchandise.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BASE = "https://fueler.store";

// Vendor string on fueler.store → our DB team slug
const VENDOR_MAP = {
  "Scuderia Ferrari":           "ferrari",
  "Red Bull Racing":            "red-bull-racing",
  "Mercedes-AMG Petronas":      "mercedes-amg-f1",
  "McLaren F1":                 "mclaren-f1",
  "Aston Martin F1":            "aston-martin-f1",
  "Haas F1":                    "haas-f1",
  "Williams Racing":            "williams-f1",
  "Alpine F1":                  "alpine-f1",
  "BWT Alpine F1 Team":         "alpine-f1",
  "Visa Cash App Racing Bulls": "rb-f1",
  "Visa Cash App RB":           "rb-f1",
  "RB":                         "rb-f1",
  "Stake F1 Team Kick Sauber":  "kick-sauber",
  "Kick Sauber":                "kick-sauber",
};

// Collections on fueler.store known to contain F1 teamwear
const COLLECTIONS = [
  "team-jackets",
  "team-hoodies",
  "formula-1",
  "red-bull-racing",
  "scuderia-ferrari",
  "mercedes-amg-petronas",
  "mclaren-f1",
  "aston-martin",
  "williams-racing",
  "haas-f1",
  "alpine-f1",
  "kick-sauber",
  "vcarb",
  "racing-bulls",
];

// Prefer these product types (in order of priority) for each team
const PREFERRED_TYPES = ["Jacket", "Hoody", "Hoodie"];

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function fetchCollection(slug) {
  const all = [];
  for (let page = 1; page <= 3; page++) {
    const url = `${BASE}/collections/${slug}/products.json?page=${page}&limit=50`;
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();
      const prods = data?.products || [];
      if (prods.length === 0) break;
      all.push(...prods);
    } catch {
      break;
    }
  }
  return all;
}

function pickImages(prod) {
  return (prod.images || [])
    .map(i => i.src)
    .filter(s => typeof s === "string")
    .slice(0, 4);
}

function categorize(pt) {
  const t = (pt || "").toLowerCase();
  if (t.includes("jacket")) return "jacket";
  if (t.includes("hood")) return "hoodie";
  return "jacket";
}

async function main() {
  console.log("Scraping F1 jackets from fueler.store...\n");

  // 1. Fetch all products from relevant collections (with dedup by product id)
  const seenId = new Set();
  const allProducts = [];
  for (const col of COLLECTIONS) {
    const ps = await fetchCollection(col);
    for (const p of ps) {
      if (seenId.has(p.id)) continue;
      seenId.add(p.id);
      allProducts.push(p);
    }
    console.log(`  collection ${col}: +${ps.length} (total ${allProducts.length})`);
  }
  console.log(`\nTotal unique products: ${allProducts.length}\n`);

  // 2. Group by our team slug
  const byTeam = {};
  for (const p of allProducts) {
    const teamSlug = VENDOR_MAP[p.vendor];
    if (!teamSlug) continue;
    // Only keep jackets/hoodies
    const pt = (p.product_type || "").toLowerCase();
    if (!PREFERRED_TYPES.some(k => pt.includes(k.toLowerCase()))) continue;
    (byTeam[teamSlug] ||= []).push(p);
  }

  for (const [slug, prods] of Object.entries(byTeam)) {
    console.log(`  ${slug}: ${prods.length} candidates`);
  }

  // 3. For each F1 team in DB, replace old car-photo products with real jackets
  const f1League = await prisma.league.findUnique({ where: { slug: "f1" } });
  if (!f1League) { console.log("\nNo f1 league"); return; }

  const teams = await prisma.team.findMany({
    where: { leagueId: f1League.id },
    include: { products: true },
  });

  let created = 0, updated = 0, deleted = 0;

  for (const team of teams) {
    const candidates = byTeam[team.slug] || [];
    if (candidates.length === 0) {
      console.log(`  ✗ ${team.slug}: no fueler.store products`);
      continue;
    }

    // Delete all existing F1 products for this team so we cleanly replace car-photo set
    for (const p of team.products) {
      await prisma.product.delete({ where: { id: p.id } });
      deleted++;
    }

    // Pick up to 3 products: prefer bomber, then other jackets, then hoodies
    const scored = candidates.map(p => {
      const title = (p.title || "").toLowerCase();
      const pt = (p.product_type || "").toLowerCase();
      let score = 0;
      if (pt.includes("jacket")) score += 10;
      if (title.includes("bomber")) score += 5;
      if (title.includes("team")) score += 3;
      if (title.includes("softshell")) score += 2;
      if (pt.includes("hood")) score += 1;
      return { p, score };
    }).sort((a, b) => b.score - a.score);

    const picked = scored.slice(0, 3).map(s => s.p);

    for (const p of picked) {
      const images = pickImages(p);
      if (images.length === 0) continue;

      const title = (p.title || "").replace(/\s+/g, " ").trim();
      const fullName = `${team.name} ${title}`;
      const slug = slugify(`${team.slug}-${p.handle}`);
      const sizes = JSON.stringify(p.options?.find(o => o.name === "Size")?.values || ["S", "M", "L", "XL", "XXL"]);
      const variant = p.variants?.[0];
      const rawPrice = parseFloat(variant?.price || "150");
      // Convert USD to MAD (website currency): ~10x
      const price = Math.round(rawPrice * 10);

      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            images: JSON.stringify(images),
            name: fullName,
            price,
          },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            name: fullName,
            slug,
            price,
            images: JSON.stringify(images),
            sizes,
            teamId: team.id,
            category: categorize(p.product_type),
            season: "2026",
            surCommande: true,
            featured: (p.title || "").toLowerCase().includes("bomber") || (p.title || "").toLowerCase().includes("softshell"),
            bestSeller: ["red-bull-racing", "ferrari", "mclaren-f1"].includes(team.slug) && (p.title || "").toLowerCase().includes("bomber"),
          },
        });
        created++;
      }
    }
    console.log(`  ✓ ${team.slug}: ${picked.length} jackets/hoodies added`);
  }

  console.log(`\nDone! Deleted: ${deleted}, Created: ${created}, Updated: ${updated}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
