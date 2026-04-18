/**
 * Enrich WC national teams from ultrafootball.com (Shopify /search/suggest.json).
 * Known to carry: Turkey, Senegal, Egypt, Poland, Croatia, Serbia + more.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BASE = "https://www.ultrafootball.com";
const TARGET = 5;
const FIXED_PRICE_MAD = 199;

// Slug → query variants
const EXTRA_QUERIES = {
  "south-korea":   ["korea"],
  "saudi-arabia":  ["saudi arabia", "saudi"],
  "ivory-coast":   ["ivory coast"],
  "usa":           ["usa", "united states"],
  "czech-republic":["czech"],
  "netherlands":   ["netherlands", "holland"],
};

function isRealImg(u) {
  return typeof u === "string" && u.startsWith("https://");
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

async function searchProducts(q) {
  const url = `${BASE}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=20`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const d = await r.json();
    return d?.resources?.results?.products || [];
  } catch {
    return [];
  }
}

function isJerseyProduct(p, countryName) {
  const t = (p.title || "").toLowerCase();
  const type = (p.type || "").toLowerCase();
  const tags = (p.tags || []).map(x => (x || "").toLowerCase());
  const cn = countryName.toLowerCase();

  // Must reference the country
  const tokens = cn.split(/\s+/);
  const hasCountry =
    tokens.every(tok => t.includes(tok)) ||
    tags.some(tag => tag === cn.replace(/\s+/g, "") || tag === cn);
  if (!hasCountry) return false;

  // Type/title must be apparel/jersey
  if (type !== "apparel" && !/jersey|kit|shirt/.test(t)) return false;

  // Exclude novelties, custom printing slots, youth (keep youth optionally? exclude to stay consistent)
  if (/custom printing|customise|customi[sz]ation/.test(t)) return false;
  if (/youth|kids|infant|baby|women'?s/.test(t)) return false;
  if (/midlayer|jacket|track jacket|anthem jacket|windbreaker|hoodie|tee\b|polo|shorts|socks|cap|scarf|bag/.test(t)) return false;
  if (/goalkeeper|gk|keeper/.test(t)) return false;

  // Must be a real jersey
  if (!/jersey|kit|shirt/.test(t)) return false;

  return true;
}

function scoreJersey(p) {
  const t = (p.title || "").toLowerCase();
  let s = 0;
  if (/2026/.test(t)) s += 20;
  if (/26\s*\/\s*27|2026\s*\/\s*27/.test(t)) s += 16;
  if (/25\s*\/\s*26|2025\s*\/\s*26/.test(t)) s += 14;
  if (/\bhome\b/.test(t)) s += 10;
  if (/\baway\b/.test(t)) s += 9;
  if (/\bthird\b/.test(t)) s += 8;
  if (/match|authentic|player/.test(t)) s += 4;
  if (/retro|classic|19\d\d|20[01]\d/.test(t)) s -= 10;
  return s;
}

function cleanTitle(t) {
  return (t || "")
    .replace(/\s+/g, " ")
    .replace(/\s*\([A-Z0-9\-]+\)\s*$/, "")  // trim trailing SKU "(IO8852-614)"
    .trim();
}

function extractImages(p) {
  const imgs = [];
  if (p.featured_image?.url) imgs.push(p.featured_image.url);
  if (p.image && p.image !== p.featured_image?.url) imgs.push(p.image);
  return imgs.filter(isRealImg);
}

async function main() {
  const nt = await prisma.league.findUnique({
    where: { slug: "national-teams" },
    include: { teams: { include: { products: true } } },
  });
  if (!nt) throw new Error("national-teams league not found");

  console.log(`Enriching ${nt.teams.length} WC teams from ultrafootball.com\n`);

  let teamsTouched = 0;
  let productsAdded = 0;

  for (const team of nt.teams) {
    const existingReal = team.products.filter(p => {
      try { return JSON.parse(p.images).some(isRealImg); } catch { return false; }
    });
    const needed = Math.max(0, TARGET - existingReal.length);
    if (needed === 0) continue;

    const queries = [team.name, ...(EXTRA_QUERIES[team.slug] || [])];
    const seen = new Set();
    const candidates = [];
    for (const q of queries) {
      const ps = await searchProducts(q);
      for (const p of ps) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        if (!isJerseyProduct(p, team.name)) continue;
        const images = extractImages(p);
        if (images.length === 0) continue;
        candidates.push({ p, images, score: scoreJersey(p) });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length === 0) continue;

    let added = 0;
    for (const cand of candidates) {
      if (added >= needed) break;
      const name = cleanTitle(cand.p.title);
      if (!name) continue;
      const prodSlug = slugify(`${team.slug}-uf-${cand.p.handle}`);
      const existing = await prisma.product.findUnique({ where: { slug: prodSlug } });
      if (existing) continue;

      const dupName = team.products.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (dupName) continue;

      const seasonMatch = name.match(/(26\/27|2026\/27|25\/26|2025\/26|2026)/i);
      const season = seasonMatch ? seasonMatch[0] : "2025/26";

      try {
        await prisma.product.create({
          data: {
            name,
            slug: prodSlug,
            price: FIXED_PRICE_MAD,
            images: JSON.stringify(cand.images),
            sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
            teamId: team.id,
            category: "jersey",
            season,
            surCommande: true,
            featured: existingReal.length === 0 && added === 0,
          },
        });
        added++;
        productsAdded++;
      } catch (e) {
        console.log(`     ⚠ ${team.slug}: create failed for ${prodSlug}: ${e.message}`);
      }
    }
    if (added > 0) {
      teamsTouched++;
      console.log(`  ${team.slug.padEnd(22)} +${added} new  (had ${existingReal.length}, target ${TARGET})`);
    }
  }

  console.log(`\nDone. Teams enriched: ${teamsTouched}. Products added: ${productsAdded}.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
