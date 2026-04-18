/**
 * Enrich WC national teams from essportswr.com via WooCommerce Store API.
 * Paginates /wp-json/wc/store/products, matches by product name.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BASE = "https://essportswr.com";
const TARGET = 5;
const PER_PAGE = 100;

// team slug → list of title match terms (case-insensitive, whole-word-ish)
const TEAM_MATCHERS = {
  "argentina":       ["argentina"],
  "algeria":         ["algeria", "algérie"],
  "australia":       ["australia"],
  "belgium":         ["belgium"],
  "brazil":          ["brazil", "brasil"],
  "cameroon":        ["cameroon", "cameroun"],
  "canada":          ["canada"],
  "colombia":        ["colombia"],
  "croatia":         ["croatia"],
  "denmark":         ["denmark"],
  "ecuador":         ["ecuador"],
  "egypt":           ["egypt"],
  "england":         ["england"],
  "france":          ["france"],
  "germany":         ["germany"],
  "ghana":           ["ghana"],
  "italy":           ["italy", "italia"],
  "ivory-coast":     ["ivory coast", "cote d'ivoire", "côte d'ivoire"],
  "japan":           ["japan"],
  "mexico":          ["mexico"],
  "morocco":         ["morocco", "maroc"],
  "netherlands":     ["netherlands", "holland"],
  "nigeria":         ["nigeria"],
  "poland":          ["poland"],
  "portugal":        ["portugal"],
  "saudi-arabia":    ["saudi arabia", "saudi"],
  "scotland":        ["scotland"],
  "senegal":         ["senegal", "sénégal"],
  "serbia":          ["serbia"],
  "south-korea":     ["south korea", "korea"],
  "spain":           ["spain", "españa"],
  "switzerland":     ["switzerland", "swiss"],
  "tunisia":         ["tunisia", "tunisie"],
  "turkey":          ["turkey", "turkiye", "türkiye"],
  "uruguay":         ["uruguay"],
  "usa":             ["united states", "usa", "u.s.a"],
  "wales":           ["wales"],
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[äâàáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[íì]/g, "i")
    .replace(/[óòô]/g, "o").replace(/[úù]/g, "u").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function matchTeam(title) {
  const n = normalize(title);
  for (const [slug, terms] of Object.entries(TEAM_MATCHERS)) {
    for (const t of terms) {
      const nt = normalize(t);
      const re = new RegExp(`(^|\\b)${nt.replace(/\s/g, "\\s+")}(\\b|$)`, "i");
      if (re.test(n)) return slug;
    }
  }
  return null;
}

function isKitProduct(title) {
  const n = normalize(title);
  // Must be a jersey/kit/shirt — exclude hoodies/polos/shorts/windbreakers
  if (/\b(kit|jersey|shirt)\b/.test(n)) return true;
  return false;
}

function scoreProduct(title) {
  const n = normalize(title);
  let s = 0;
  if (/2026/.test(n)) s += 20;
  if (/25 26|2025 26/.test(n)) s += 16;
  if (/\bhome\b/.test(n)) s += 10;
  if (/\baway\b/.test(n)) s += 9;
  if (/\bthird\b/.test(n)) s += 8;
  if (/player version|authentic/.test(n)) s += 4;
  if (/retro|special edition|1[89]\d\d|19\d\d/.test(n)) s -= 10;
  if (/windbreaker|track suit|jacket|polo|hoodie/.test(n)) s -= 6;
  return s;
}

function extractImageUrls(p) {
  return (p.images || []).map(i => i.src).filter(u => typeof u === "string" && u.startsWith("https://"));
}

async function fetchPage(page) {
  const url = `${BASE}/wp-json/wc/store/products?per_page=${PER_PAGE}&page=${page}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  try { return await r.json(); } catch { return []; }
}

async function collectAll() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await fetchPage(page);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return all;
}

function cleanTitle(t) {
  return (t || "")
    .replace(/\s+/g, " ")
    .replace(/X Adid\xc2\xaas|X Adidäs|X Adid\u00e4s|X Adid\u00aas/g, "X Adidas")
    .replace(/Pum\u00aa/g, "Puma")
    .trim();
}

async function main() {
  console.log(`Fetching essportswr products...`);
  const products = await collectAll();
  console.log(`  got ${products.length} products\n`);

  // Index teams in DB
  const nt = await prisma.league.findUnique({
    where: { slug: "national-teams" },
    include: { teams: { include: { products: true } } },
  });
  if (!nt) throw new Error("national-teams league not found");
  const teamMap = new Map(nt.teams.map(t => [t.slug, t]));

  // Bucket by team slug
  const byTeam = new Map();
  for (const p of products) {
    const slug = matchTeam(p.name);
    if (!slug) continue;
    if (!isKitProduct(p.name)) continue;
    if (!byTeam.has(slug)) byTeam.set(slug, []);
    byTeam.get(slug).push(p);
  }

  console.log(`Matched products for ${byTeam.size} teams:\n`);
  let teamsTouched = 0;
  let productsAdded = 0;

  for (const [slug, matches] of byTeam.entries()) {
    const team = teamMap.get(slug);
    if (!team) { console.log(`  ${slug}: team not in DB`); continue; }

    const existingReal = team.products.filter(p => {
      try {
        const imgs = JSON.parse(p.images);
        return imgs.some(u => typeof u === "string" && /^https:\/\//.test(u));
      } catch { return false; }
    });
    const needed = Math.max(0, TARGET - existingReal.length);
    if (needed === 0) continue;

    // Score + sort, dedupe by handle
    const scored = matches
      .map(p => ({ p, score: scoreProduct(p.name), images: extractImageUrls(p) }))
      .filter(c => c.images.length > 0)
      .sort((a, b) => b.score - a.score);

    let added = 0;
    for (const cand of scored) {
      if (added >= needed) break;
      const name = cleanTitle(cand.p.name);
      if (!name) continue;
      const prodSlug = slugify(`${slug}-ess-${cand.p.slug}`);
      const existing = await prisma.product.findUnique({ where: { slug: prodSlug } });
      if (existing) continue;

      // Price is in minor units (MAD × 100)
      const priceRaw = parseFloat(cand.p.prices?.price || "0");
      const priceMAD = Math.max(199, Math.round(priceRaw / 100));

      const n = normalize(name);
      const seasonMatch = n.match(/(25 26|2025 26|2026)/);
      const season = seasonMatch ? seasonMatch[0].replace(/\s+/g, "/") : "2025/26";

      try {
        await prisma.product.create({
          data: {
            name,
            slug: prodSlug,
            price: priceMAD,
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
        console.log(`     ⚠ create failed for ${prodSlug}: ${e.message}`);
      }
    }
    if (added > 0) {
      teamsTouched++;
      console.log(`  ${slug.padEnd(22)} +${added} new  (had ${existingReal.length}, target ${TARGET})`);
    }
  }

  console.log(`\nDone. Teams enriched: ${teamsTouched}. Products added: ${productsAdded}.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
