/**
 * Enrich World Cup national teams with real 2026 jerseys from soccerwearhouse.com
 * (Shopify /search/suggest.json). Adds up to TARGET real-image jersey products
 * per team. Prices are fixed at 199 MAD to match existing WC jerseys.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BASE = "https://soccerwearhouse.com";
const TARGET = 5;       // stop once team has this many real-image products
const FIXED_PRICE_MAD = 199;

// Country slug → extra query variants (first is always the team name)
const EXTRA_QUERIES = {
  "south-korea": ["korea"],
  "saudi-arabia": ["saudi"],
  "usa": ["usa", "united states"],
  "czech-republic": ["czech"],
  "ivory-coast": ["ivory coast", "cote d'ivoire"],
};

function isRealImg(u) {
  return typeof u === "string" && (u.includes("cdn.shopify.com") || u.includes("pulsesfootball"));
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

async function searchProducts(q) {
  const url = `${BASE}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=15`;
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
  const type = (p.type || "").toLowerCase();
  const title = (p.title || "").toLowerCase();
  const tags = (p.tags || []).map(t => (t || "").toLowerCase());
  const cn = countryName.toLowerCase();

  // Must be Jersey/Kit
  if (type !== "jerseys" && !/jersey|kit|shirt/.test(title)) return false;
  // Must reference the country (avoid novelties tagged incidentally)
  if (!title.includes(cn) && !tags.includes(cn.replace(/\s+/g, ""))) {
    // try matches against common country tokens
    const tokens = cn.split(/\s+/);
    if (!tokens.every(t => title.includes(t))) return false;
  }
  // Exclude novelties that slipped through
  if (/(air freshener|lanyard|pin badge|keychain|scarf|mug|sock|short|shorts)/.test(title)) return false;
  return true;
}

function scoreJersey(p) {
  const t = (p.title || "").toLowerCase();
  let s = 0;
  if (/2026/.test(t)) s += 20;
  if (/25\s*\/\s*26|2025\s*\/\s*26/.test(t)) s += 16;
  if (/\bhome\b/.test(t)) s += 10;
  if (/\baway\b/.test(t)) s += 9;
  if (/\bthird\b/.test(t)) s += 8;
  if (/\bauthentic|match\b/.test(t)) s += 4;
  if (/player|stadium|mens|men's/.test(t)) s += 2;
  // Dodge old years
  if (/\b19\d{2}\b|\b20[01]\d\b|\b2[0-3]\s*\/\s*2[0-3]/.test(t)) s -= 8;
  if (/22\s*\/\s*23|21\s*\/\s*22|20\s*\/\s*21/.test(t)) s -= 4;
  if (/retro/.test(t)) s -= 4;
  // Dodge player-name variants (keep main SKU, not all named ones)
  return s;
}

function cleanTitle(t) {
  return (t || "")
    .replace(/\s+/g, " ")
    .replace(/\s*\(.*?\)\s*$/, "")  // trim trailing colour parenthesis
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

  console.log(`Enriching ${nt.teams.length} WC teams from soccerwearhouse.com\n`);

  let teamsTouched = 0;
  let productsAdded = 0;

  for (const team of nt.teams) {
    const existingReal = team.products.filter(p => {
      try { return JSON.parse(p.images).some(isRealImg); } catch { return false; }
    });
    const needed = Math.max(0, TARGET - existingReal.length);
    if (needed === 0) continue;

    // Gather candidates across query variants
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
      const prodSlug = slugify(`${team.slug}-swh-${cand.p.handle}`);
      const existing = await prisma.product.findUnique({ where: { slug: prodSlug } });
      if (existing) continue;

      // Avoid near-duplicate by handle root
      const handleRoot = cand.p.handle.replace(/-copy.*$/, "").replace(/-\d+$/, "");
      const dupName = team.products.find(p => p.name.toLowerCase() === cleanTitle(cand.p.title).toLowerCase());
      if (dupName) continue;

      const seasonMatch = cand.p.title.match(/(25\s*\/\s*26|2025\s*\/\s*26|2026|24\s*\/\s*25)/i);
      const season = seasonMatch ? seasonMatch[0].replace(/\s+/g, "") : "2025/26";

      try {
        await prisma.product.create({
          data: {
            name: cleanTitle(cand.p.title),
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
        console.log(`   ⚠ ${team.slug}: create failed for ${prodSlug}: ${e.message}`);
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
