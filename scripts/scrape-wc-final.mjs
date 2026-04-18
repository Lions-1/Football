/**
 * Final-pass scraper for stubborn WC gaps.
 *  - bscstoreusa.com   → Ecuador (Marathon 2026 WC kits)
 *  - planetfoot.com    → Tunisia (Kappa 25/26 collection) + any other matches
 *  - store.fifa.com    → Saudi Arabia (Adidas WC26 home jersey) + any other matches
 * All three are Shopify storefronts using cdn.shopify.com (already whitelisted).
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TARGET = 5;
const FIXED_PRICE_MAD = 199;

const STORES = [
  { base: "https://bscstoreusa.com",  pathPrefix: "/en" },        // bilingual store, English path
  { base: "https://planetfoot.com",   pathPrefix: "/en" },        // English locale
  { base: "https://store.fifa.com",   pathPrefix: "" },           // FIFA official
];

const TEAM_MATCHERS = {
  "argentina":       ["argentina"],
  "algeria":         ["algeria", "algérie", "argelia"],
  "australia":       ["australia"],
  "belgium":         ["belgium", "belgique"],
  "brazil":          ["brazil", "brasil"],
  "cameroon":        ["cameroon", "cameroun"],
  "canada":          ["canada"],
  "colombia":        ["colombia"],
  "croatia":         ["croatia", "croatie"],
  "denmark":         ["denmark", "danemark"],
  "ecuador":         ["ecuador"],
  "egypt":           ["egypt", "egypte"],
  "england":         ["england", "angleterre"],
  "france":          ["france"],
  "germany":         ["germany", "allemagne"],
  "ghana":           ["ghana"],
  "italy":           ["italy", "italie"],
  "ivory-coast":     ["ivory coast", "côte d'ivoire", "cote d'ivoire"],
  "japan":           ["japan", "japon"],
  "mexico":          ["mexico", "mexique"],
  "morocco":         ["morocco", "maroc"],
  "netherlands":     ["netherlands", "pays-bas", "holland"],
  "nigeria":         ["nigeria"],
  "poland":          ["poland", "pologne"],
  "portugal":        ["portugal"],
  "saudi-arabia":    ["saudi arabia", "saudi", "arabie saoudite"],
  "scotland":        ["scotland", "écosse"],
  "senegal":         ["senegal", "sénégal"],
  "serbia":          ["serbia", "serbie"],
  "south-korea":     ["south korea", "korea", "corée du sud", "coree"],
  "spain":           ["spain", "espagne"],
  "switzerland":     ["switzerland", "suisse"],
  "tunisia":         ["tunisia", "tunisie"],
  "turkey":          ["turkey", "turquie", "türkiye"],
  "uruguay":         ["uruguay"],
  "usa":             ["united states", "usa", "u.s.a"],
  "wales":           ["wales", "pays de galles"],
};

// Per-team query variants (first is team.name)
const EXTRA_QUERIES = {
  "saudi-arabia":  ["saudi arabia", "saudi"],
  "south-korea":   ["korea"],
  "usa":           ["united states"],
  "ivory-coast":   ["ivory coast"],
  "ecuador":       ["ecuador 2026", "ecuador world cup"],
  "tunisia":       ["tunisia 2025", "tunisia world cup", "tunisie"],
};

function normalize(s) {
  return (s || "").toLowerCase()
    .replace(/[áâàãä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íì]/g, "i")
    .replace(/[óòôö]/g, "o").replace(/[úùü]/g, "u").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function matchTeam(title) {
  const n = normalize(title);
  for (const [slug, terms] of Object.entries(TEAM_MATCHERS)) {
    for (const t of terms) {
      const nt = normalize(t);
      if (new RegExp(`\\b${nt.replace(/\s/g, "\\s+")}\\b`, "i").test(n)) return slug;
    }
  }
  return null;
}

function isJerseyTitle(title) {
  const n = normalize(title);
  // Must be a jersey/kit/shirt (+ French "maillot" / Spanish "camiseta" / Portuguese "camisola")
  if (!/\b(jersey|kit|shirt|maillot|camiseta|camisola)\b/.test(n)) return false;
  // Exclude novelties
  if (/(scarf|echarpe|bracelet|sticker|mask|mug|keychain|poster|water bottle)/.test(n)) return false;
  // Exclude accessories
  if (/(polo|cap|bone|hat|sock|chaussette|short|shorts|jacket|jaqueta|track jacket|windbreaker|hoodie|sweat|pant|leggings|anthem jacket|chompa|tracksuit|training.*shorts|midlayer)/.test(n)) return false;
  // Exclude youth/women (keep main adult men's range for consistency)
  if (/\b(kids|youth|niños|women'?s|femenina|femme|mujer|mulher|infant|bebe)\b/.test(n)) return false;
  // Exclude goalkeeper variants
  if (/(goalkeeper|gk|keeper|guarda redes|gardien|portero)/.test(n)) return false;
  return true;
}

function scoreJersey(title) {
  const n = normalize(title);
  let s = 0;
  if (/\b2026\b|\b26 27\b|26\s*27/.test(n)) s += 20;
  if (/25\s*26|2025\s*26/.test(n)) s += 16;
  if (/world cup|copa do mundo|mundial|coupe du monde/.test(n)) s += 8;
  if (/\bhome\b|principal|domicile|casa/.test(n)) s += 10;
  if (/\baway\b|alternativa|visitante|exterieur/.test(n)) s += 9;
  if (/\bthird\b|troisieme|terceiro/.test(n)) s += 8;
  if (/match|authentic|player/.test(n)) s += 3;
  if (/retro|classic|19\d\d|20[01]\d|pre-match/.test(n)) s -= 10;
  return s;
}

function extractImages(p) {
  const imgs = [];
  if (p.featured_image?.url) imgs.push(p.featured_image.url);
  if (p.image && p.image !== p.featured_image?.url) imgs.push(p.image);
  return imgs.filter(u =>
    typeof u === "string" &&
    u.startsWith("https://") &&
    !u.includes("BANNER") && !u.includes("Descricao_")
  );
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

function cleanTitle(t) {
  return (t || "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*(Fan Version|Player Version|World Cup\s*)*$/gi, " ")
    .replace(/\s*Adult\s*(Kappa|Nike|Adidas|Puma)\s*/gi, " ")
    .replace(/\s+-\s+$/, "")
    .trim();
}

async function searchStore(store, q) {
  const url = `${store.base}${store.pathPrefix}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=15`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const d = await r.json();
    return d?.resources?.results?.products || [];
  } catch {
    return [];
  }
}

async function main() {
  const nt = await prisma.league.findUnique({
    where: { slug: "national-teams" },
    include: { teams: { include: { products: true } } },
  });
  if (!nt) throw new Error("national-teams league not found");

  console.log(`Final-pass: searching ${STORES.length} stores for WC gaps\n`);

  let teamsTouched = 0;
  let productsAdded = 0;

  for (const team of nt.teams) {
    const existingReal = team.products.filter(p => {
      try {
        const imgs = JSON.parse(p.images);
        return imgs.some(u => typeof u === "string" && u.startsWith("https://"));
      } catch { return false; }
    });
    const needed = Math.max(0, TARGET - existingReal.length);
    if (needed === 0) continue;

    const queries = [team.name, ...(EXTRA_QUERIES[team.slug] || [])];

    // Gather candidates across stores
    const seen = new Set();
    const candidates = [];
    for (const store of STORES) {
      for (const q of queries) {
        const products = await searchStore(store, q);
        for (const p of products) {
          const key = `${store.base}:${p.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (!isJerseyTitle(p.title)) continue;
          const teamSlug = matchTeam(p.title);
          if (teamSlug !== team.slug) continue;
          const images = extractImages(p);
          if (images.length === 0) continue;
          candidates.push({ p, images, score: scoreJersey(p.title), store: store.base });
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length === 0) continue;

    let added = 0;
    for (const cand of candidates) {
      if (added >= needed) break;
      const name = cleanTitle(cand.p.title);
      if (!name) continue;
      const storeTag = cand.store.replace(/^https?:\/\/(www\.)?/, "").split(".")[0];
      const prodSlug = slugify(`${team.slug}-${storeTag}-${cand.p.handle}`);
      const existing = await prisma.product.findUnique({ where: { slug: prodSlug } });
      if (existing) continue;
      const dupName = team.products.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (dupName) continue;

      const seasonMatch = normalize(name).match(/(25 26|2025 26|2026|26 27|2026 27)/);
      const season = seasonMatch ? seasonMatch[0].replace(/\s+/g, "/") : "2025/26";

      try {
        await prisma.product.create({
          data: {
            name,
            slug: prodSlug,
            price: FIXED_PRICE_MAD,
            images: JSON.stringify(cand.images.slice(0, 5)),
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
        console.log(`     ⚠ ${team.slug}: ${e.message}`);
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
