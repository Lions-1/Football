/**
 * Comprehensive WC2026 scraper: for every national team in DB, hits
 * pulsesfootball.com's search suggest endpoint and populates the
 * country with real Home + Away jersey photos, creating 2-3 products per team.
 *
 * Replaces local crest images (/logos/national-teams/*.png) with real
 * Shopify CDN jersey photography.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "https://pulsesfootball.com";

// Country slug → search term on pulsesfootball
const SEARCH_TERMS = {
  "morocco":      "morocco",
  "argentina":    "argentina",
  "brazil":       "brazil",
  "france":       "france",
  "germany":      "germany",
  "spain":        "spain",
  "england":      "england",
  "portugal":     "portugal",
  "italy":        "italy",
  "netherlands":  "netherlands",
  "belgium":      "belgium",
  "japan":        "japan",
  "croatia":      "croatia",
  "uruguay":      "uruguay",
  "colombia":     "colombia",
  "mexico":       "mexico",
  "usa":          "usa",
  "senegal":      "senegal",
  "nigeria":      "nigeria",
  "egypt":        "egypt",
  "algeria":      "algeria",
  "turkey":       "turkey",
  "denmark":      "denmark",
  "poland":       "poland",
  "cameroon":     "cameroon",
  "south-korea":  "korea",
  "saudi-arabia": "saudi arabia",
  "canada":       "canada",
  "australia":    "australia",
  "ghana":        "ghana",
  "switzerland":  "switzerland",
  "scotland":     "scotland",
  "wales":        "wales",
  "tunisia":      "tunisia",
  "ecuador":      "ecuador",
  "serbia":       "serbia",
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function isReal(url) {
  return typeof url === "string" && (url.includes("cdn.shopify.com") || url.includes("pulsesfootball"));
}

// Keep only real jersey photos, drop banners/descriptions
function filterUsableImages(urls) {
  return urls
    .filter(u => typeof u === "string")
    .filter(u => !u.toLowerCase().includes("banner"))
    .filter(u => !u.toLowerCase().includes("descricao"))
    .filter(u => !u.toLowerCase().includes("small_"))
    .slice(0, 3);
}

async function searchCountry(term) {
  // Try 2026 first, then fall back to just country name
  for (const q of [`${term} 2026`, `${term} 25/26`, term]) {
    const url = `${BASE}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=20`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    const products = data?.resources?.results?.products || [];
    if (products.length > 0) return products;
  }
  return [];
}

async function fetchProductDetail(handle) {
  try {
    const r = await fetch(`${BASE}/products/${handle}.json`);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.product || null;
  } catch {
    return null;
  }
}

// Select the best 3 products per country: home, away, and one extra (third/player)
function pickBestProducts(results, countryTerm) {
  const lower = countryTerm.toLowerCase();
  const filtered = results.filter(p => {
    const h = (p.handle || "").toLowerCase();
    const t = (p.title || "").toLowerCase();
    if (!h.includes(lower.split(" ")[0])) return false;
    // skip kids/women/long-sleeve/kit combos/accessories
    if (h.includes("kids") || h.includes("women") || h.includes("long-sleeve")) return false;
    if (h.includes("kit-") || t.includes("kit ")) return false; // skip bundle kits
    if (h.includes("shorts") || h.includes("cap") || h.includes("hat")) return false;
    return true;
  });

  const home = filtered.find(p => {
    const h = (p.handle || "").toLowerCase();
    return !h.includes("away") && !h.includes("third") && !h.includes("goalkeeper") && !h.includes("player-version") && !h.includes("slim-fit");
  });
  const away = filtered.find(p => (p.handle || "").toLowerCase().includes("away") && !p.handle.includes("player-version"));
  const player = filtered.find(p => {
    const h = (p.handle || "").toLowerCase();
    return (h.includes("player") || h.includes("slim-fit")) && !h.includes("away");
  });

  const picked = [home, away, player].filter(Boolean);
  if (picked.length > 0) return picked;

  // Fallback: no strict matches — take first 3 unique-handle products
  const seen = new Set();
  const out = [];
  for (const p of filtered) {
    if (seen.has(p.handle)) continue;
    seen.add(p.handle);
    out.push(p);
    if (out.length >= 3) break;
  }
  return out;
}

async function main() {
  const nat = await prisma.league.findUnique({
    where: { slug: "national-teams" },
    include: { teams: true },
  });
  if (!nat) { console.log("No national-teams league"); return; }

  console.log(`Scraping WC2026 jerseys for ${nat.teams.length} countries...\n`);

  let patched = 0, created = 0, skipped = 0;

  for (const team of nat.teams) {
    const term = SEARCH_TERMS[team.slug];
    if (!term) { console.log(`  ? ${team.slug}: no search term`); continue; }

    const results = await searchCountry(term);
    if (results.length === 0) {
      console.log(`  ✗ ${team.slug}: no search results`);
      skipped++;
      continue;
    }

    const picked = pickBestProducts(results, term);
    if (picked.length === 0) {
      console.log(`  ✗ ${team.slug}: no usable products (${results.length} raw)`);
      skipped++;
      continue;
    }

    // Delete existing placeholder products (those with local PNG crest images only)
    const existing = await prisma.product.findMany({
      where: { teamId: team.id },
    });
    for (const ep of existing) {
      const imgs = JSON.parse(ep.images || "[]");
      const hasReal = imgs.some(isReal);
      if (!hasReal) {
        await prisma.product.delete({ where: { id: ep.id } });
      }
    }

    // Fetch details for each picked product to get full image set
    for (const p of picked) {
      const detail = await fetchProductDetail(p.handle);
      let images = [];
      if (detail?.images) {
        images = filterUsableImages(detail.images.map(i => i.src));
      }
      if (images.length === 0 && p.featured_image?.url) {
        images = [p.featured_image.url];
      }
      if (images.length === 0) continue;

      const title = p.title.replace(/\s+/g, " ").trim();
      const slug = slugify(`${team.slug}-${p.handle}`);

      // Detect variant
      const h = p.handle.toLowerCase();
      let variant = "home";
      if (h.includes("away")) variant = "away";
      else if (h.includes("third")) variant = "third";
      else if (h.includes("player") || h.includes("slim")) variant = "player";

      const isMorocco = team.slug === "morocco";

      const existingProduct = await prisma.product.findUnique({ where: { slug } });
      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            images: JSON.stringify(images),
            name: title,
            surCommande: !isMorocco,
          },
        });
        patched++;
      } else {
        await prisma.product.create({
          data: {
            name: title,
            slug,
            price: 199,
            images: JSON.stringify(images),
            sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
            teamId: team.id,
            category: "jersey",
            season: "2025/26",
            surCommande: !isMorocco,
            featured: variant === "home",
            bestSeller: variant === "home" && ["morocco", "brazil", "argentina", "france", "portugal", "germany", "england", "italy", "spain"].includes(team.slug),
          },
        });
        created++;
      }
    }
    console.log(`  ✓ ${team.slug}: ${picked.length} products`);
  }

  console.log(`\nDone! Created: ${created}, Patched: ${patched}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
