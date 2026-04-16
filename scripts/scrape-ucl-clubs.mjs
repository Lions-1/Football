/**
 * Targeted scraper: fill/repair UCL club products with real Shopify jersey images.
 * Hits pulsesfootball.com /search/suggest.json for each club; picks top jerseys.
 * - Deletes products with no real images (placeholders) for that team.
 * - Creates real-jersey products up to MIN_PRODUCTS per team.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BASE = "https://pulsesfootball.com";
const MIN_PRODUCTS = 4;

// Clubs we want to enrich. Map club slug → search query variants.
const TARGETS = {
  "liverpool":        ["liverpool", "liverpool 25/26", "liverpool home"],
  "napoli":           ["napoli", "napoli 25/26", "napoli home"],
  "benfica":          ["benfica", "benfica 25/26", "camisola benfica"],
  "porto":            ["porto fc", "fc porto", "porto 25/26"],
  "ajax":             ["ajax", "ajax amsterdam", "ajax 25/26"],
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function isRealImage(url) {
  return typeof url === "string" && (url.includes("cdn.shopify.com") || url.includes("pulsesfootball"));
}

async function searchProducts(q) {
  const url = `${BASE}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const d = await r.json();
    return d?.resources?.results?.products || [];
  } catch {
    return [];
  }
}

function scoreProduct(p, clubSlug) {
  const t = (p.title || "").toLowerCase();
  const slugTokens = clubSlug.split("-");
  let score = 0;

  // Team match (must contain at least one club token to be relevant)
  const matchesClub = slugTokens.some(tok => tok.length >= 3 && t.includes(tok));
  if (!matchesClub) return -1;

  // Prefer jersey/camisola
  if (/(jersey|camisola|shirt|kit)/.test(t)) score += 10;
  // Prefer current season
  if (/25\s*\/\s*26|2025\s*\/\s*26|2025-26|2025\/26/.test(t)) score += 8;
  if (/24\s*\/\s*25|2024\s*\/\s*25|2024-25/.test(t)) score += 5;
  // Home/Away/Third
  if (/(home|principal|i |i$| home)/.test(t)) score += 6;
  if (/(away|alternativa|visitante|ii )/.test(t)) score += 5;
  if (/(third|terceiro|iii)/.test(t)) score += 4;
  // Training/Track less preferred but ok
  if (/(training|treino)/.test(t)) score += 2;
  if (/(fato|tracksuit|conjunto)/.test(t)) score += 1;
  // Dodge GK
  if (/(guarda.redes|goalkeeper|gk|keeper)/.test(t)) score -= 4;
  // Dodge weird items
  if (/(fleece|casaco|jaqueta|polo|mug|keychain|scarf|cachecol|bone|cap)/.test(t)) score -= 2;

  return score;
}

function extractImages(p) {
  const imgs = [];
  if (p.featured_image?.url) imgs.push(p.featured_image.url);
  if (p.image && p.image !== p.featured_image?.url) imgs.push(p.image);
  return imgs.filter(isRealImage);
}

function cleanTitle(title, clubName) {
  // Strip emojis and "ÚLTIMAS UNIDADES" banners, trim to reasonable length
  return (title || "")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/-\s*ÚLTIMAS UNIDADES/gi, "")
    .replace(/-\s*LAN[ÇC]AMENTO/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Scraping UCL club enrichment from pulsesfootball...\n");

  for (const [clubSlug, queries] of Object.entries(TARGETS)) {
    const team = await prisma.team.findUnique({
      where: { slug: clubSlug },
      include: { products: true },
    });
    if (!team) { console.log(`  ${clubSlug}: TEAM NOT FOUND`); continue; }

    // Gather candidates from all query variants
    const seen = new Set();
    const candidates = [];
    for (const q of queries) {
      const ps = await searchProducts(q);
      for (const p of ps) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        const images = extractImages(p);
        if (images.length === 0) continue;
        const score = scoreProduct(p, clubSlug);
        if (score <= 0) continue;
        candidates.push({ p, images, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    console.log(`  ${clubSlug}: ${candidates.length} real-jersey candidates`);

    // Count real-image products already for this team
    const existingReal = team.products.filter(p => {
      try { return JSON.parse(p.images).some(isRealImage); }
      catch { return false; }
    });

    // Delete placeholder (non-real-image) products for this team
    const placeholders = team.products.filter(p => !existingReal.includes(p));
    for (const ph of placeholders) {
      await prisma.product.delete({ where: { id: ph.id } });
    }
    if (placeholders.length > 0) console.log(`     deleted ${placeholders.length} placeholders`);

    const needed = Math.max(0, MIN_PRODUCTS - existingReal.length);
    if (needed === 0) { console.log(`     already has ${existingReal.length} real-image products — skip add`); continue; }

    // Add top `needed` candidates that aren't already in DB by slug
    let added = 0;
    for (const cand of candidates) {
      if (added >= needed) break;
      const name = cleanTitle(cand.p.title, team.name);
      if (!name) continue;
      const prodSlug = slugify(`${clubSlug}-${cand.p.handle}`);
      const existing = await prisma.product.findUnique({ where: { slug: prodSlug } });
      if (existing) continue;

      const rawPrice = parseFloat(cand.p.price_min || cand.p.price || "30");
      const priceMAD = Math.max(180, Math.round(rawPrice * 10));

      try {
        await prisma.product.create({
          data: {
            name,
            slug: prodSlug,
            price: priceMAD,
            images: JSON.stringify(cand.images),
            sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
            teamId: team.id,
            category: /treino|training/i.test(name) ? "training" : "jersey",
            season: "2025/26",
            surCommande: true,
            featured: added === 0,
          },
        });
        added++;
      } catch (e) {
        console.log(`     ⚠ create failed for ${prodSlug}: ${e.message}`);
      }
    }
    console.log(`     + added ${added} new real-jersey products`);
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
