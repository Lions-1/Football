/**
 * Paginate pulsesfootball /collections/world-cup-2026/products.json
 * and also /collections/national-teams/products.json.
 * Match products to WC team slugs by title; import up to TARGET products each.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BASE = "https://pulsesfootball.com";
const COLLECTIONS = ["world-cup-2026", "national-teams"];
const TARGET = 5;
const FIXED_PRICE_MAD = 199;
const PER_PAGE = 50;

const TEAM_MATCHERS = {
  "argentina":       ["argentina"],
  "algeria":         ["algeria", "algérie", "argelia"],
  "australia":       ["australia"],
  "belgium":         ["belgium", "bélgica"],
  "brazil":          ["brazil", "brasil"],
  "cameroon":        ["cameroon", "camarões", "camerun"],
  "canada":          ["canada", "canadá"],
  "colombia":        ["colombia", "colômbia"],
  "croatia":         ["croatia", "croácia"],
  "denmark":         ["denmark", "dinamarca"],
  "ecuador":         ["ecuador", "equador"],
  "egypt":           ["egypt", "egito"],
  "england":         ["england", "inglaterra"],
  "france":          ["france", "frança"],
  "germany":         ["germany", "alemanha"],
  "ghana":           ["ghana", "gana"],
  "italy":           ["italy", "italia", "itália"],
  "ivory-coast":     ["ivory coast", "costa marfim", "costa do marfim"],
  "japan":           ["japan", "japão"],
  "mexico":          ["mexico", "méxico"],
  "morocco":         ["morocco", "marrocos", "maroc"],
  "netherlands":     ["netherlands", "holanda", "países baixos"],
  "nigeria":         ["nigeria", "nigéria"],
  "poland":          ["poland", "polonia", "polónia"],
  "portugal":        ["portugal"],
  "saudi-arabia":    ["saudi arabia", "saudi", "arabia saudita"],
  "scotland":        ["scotland", "escócia"],
  "senegal":         ["senegal"],
  "serbia":          ["serbia", "sérvia"],
  "south-korea":     ["south korea", "korea", "coreia"],
  "spain":           ["spain", "españa", "espanha"],
  "switzerland":     ["switzerland", "suíça"],
  "tunisia":         ["tunisia", "tunísia", "tunisie"],
  "turkey":          ["turkey", "turquia", "türkiye"],
  "uruguay":         ["uruguay", "uruguai"],
  "usa":             ["united states", "usa", "estados unidos"],
  "wales":           ["wales", "país de gales"],
};

function normalize(s) {
  return (s || "").toLowerCase()
    .replace(/[áâàã]/g, "a").replace(/[éèê]/g, "e").replace(/[íì]/g, "i")
    .replace(/[óòô]/g, "o").replace(/[úù]/g, "u").replace(/[ç]/g, "c")
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

function isKitTitle(title) {
  const n = normalize(title);
  if (!/(jersey|camisola|kit|shirt|camiseta)/.test(n)) return false;
  if (/(goalkeeper|guarda redes|keeper|kids|women|feminina|mujer|infant)/.test(n)) return false;
  if (/(scarf|cachecol|sock|meia|short|bag|mochila|keychain|mug|caneca|cap|bone|hat)/.test(n)) return false;
  return true;
}

function scoreProduct(title) {
  const n = normalize(title);
  let s = 0;
  if (/2026|26\s*27/.test(n)) s += 20;
  if (/25\s*26|2025\s*26/.test(n)) s += 14;
  if (/world cup|copa do mundo|mundial|copa 2026/.test(n)) s += 8;
  if (/\bhome\b|principal/.test(n)) s += 10;
  if (/\baway\b|alternativa|visitante/.test(n)) s += 9;
  if (/\bthird\b|terceiro|terceira/.test(n)) s += 8;
  if (/player|authentic/.test(n)) s += 4;
  if (/retro|classic|19\d\d|20[01]\d/.test(n)) s -= 10;
  if (/fan version/.test(n)) s += 2;
  return s;
}

function extractImages(p) {
  const imgs = (p.images || []).map(i => i?.src).filter(Boolean);
  // Filter out banners/descriptors that appear on every product
  return imgs.filter(u =>
    !u.includes("BANNER_PAG") &&
    !u.includes("Descricao_Pulses") &&
    !u.includes("BANNER_PAGINA") &&
    !u.includes("produto_f05ca1f7") &&
    u.startsWith("https://")
  );
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

function cleanTitle(t) {
  return (t || "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*Fan Version/i, "")
    .replace(/\s*-\s*Player Version/i, " (Player)")
    .trim();
}

async function fetchCollection(handle) {
  const out = [];
  for (let page = 1; page <= 6; page++) {
    const url = `${BASE}/collections/${handle}/products.json?limit=${PER_PAGE}&page=${page}`;
    try {
      const r = await fetch(url);
      if (!r.ok) break;
      const d = await r.json();
      const batch = d?.products || [];
      if (batch.length === 0) break;
      out.push(...batch);
      if (batch.length < PER_PAGE) break;
    } catch { break; }
  }
  return out;
}

async function main() {
  console.log("Fetching pulsesfootball collections...");
  const seen = new Set();
  const all = [];
  for (const coll of COLLECTIONS) {
    const batch = await fetchCollection(coll);
    for (const p of batch) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      all.push(p);
    }
    console.log(`  ${coll}: +${batch.length} products (${all.length} unique)`);
  }

  const nt = await prisma.league.findUnique({
    where: { slug: "national-teams" },
    include: { teams: { include: { products: true } } },
  });
  if (!nt) throw new Error("national-teams not found");
  const teamMap = new Map(nt.teams.map(t => [t.slug, t]));

  const byTeam = new Map();
  for (const p of all) {
    const slug = matchTeam(p.title);
    if (!slug) continue;
    if (!isKitTitle(p.title)) continue;
    if (!byTeam.has(slug)) byTeam.set(slug, []);
    byTeam.get(slug).push(p);
  }

  console.log(`\nMatched products for ${byTeam.size} teams.\n`);
  let teamsTouched = 0, productsAdded = 0;

  for (const [slug, items] of byTeam.entries()) {
    const team = teamMap.get(slug);
    if (!team) continue;

    const existingReal = team.products.filter(p => {
      try {
        const imgs = JSON.parse(p.images);
        return imgs.some(u => typeof u === "string" && u.startsWith("https://"));
      } catch { return false; }
    });
    const needed = Math.max(0, TARGET - existingReal.length);
    if (needed === 0) continue;

    const scored = items
      .map(p => ({ p, images: extractImages(p), score: scoreProduct(p.title) }))
      .filter(c => c.images.length > 0)
      .sort((a, b) => b.score - a.score);

    let added = 0;
    for (const cand of scored) {
      if (added >= needed) break;
      const name = cleanTitle(cand.p.title);
      if (!name) continue;
      const prodSlug = slugify(`${slug}-pf-${cand.p.handle}`);
      const existing = await prisma.product.findUnique({ where: { slug: prodSlug } });
      if (existing) continue;
      const dupName = team.products.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (dupName) continue;

      const seasonMatch = normalize(name).match(/(25 26|2025 26|26 27|2026 27|2026)/);
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
        console.log(`     ⚠ ${slug}: ${e.message}`);
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
