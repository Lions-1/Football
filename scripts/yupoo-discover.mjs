/**
 * Phase 1: Discover Yupoo team category IDs by crawling the all-categories page.
 * Outputs a JSON mapping that the main scraper can consume.
 */
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Referer": "https://wanfing.x.yupoo.com/",
};

function decodeEntities(s) {
  return (s || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function normalize(s) {
  return decodeEntities(s).toLowerCase()
    .replace(/[áâàãäå]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i")
    .replace(/[óòôöõø]/g, "o").replace(/[úùûü]/g, "u").replace(/[ç]/g, "c")
    .replace(/[ñ]/g, "n").replace(/[ş]/g, "s").replace(/[ı]/g, "i")
    .replace(/[ž]/g, "z").replace(/[ć]/g, "c").replace(/[š]/g, "s")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(s) {
  return normalize(s).split(" ").filter(t => t.length >= 2);
}

// Stop-words that shouldn't drive a match alone
const STOP = new Set(["fc", "cf", "sc", "ac", "de", "la", "le", "el", "los", "das", "do", "da", "club", "city", "united", "real", "sport", "sports", "04", "05", "06", "96", "05", "1909"]);

// Aliases: Yupoo name → DB slug (forces a match)
const ALIASES = {
  "bayern munchen": "bayern-munich",
  "bayer 04 leverkusen": "bayer-leverkusen",
  "borussia m gladbach": "borussia-monchengladbach",
  "borussia mgladbach": "borussia-monchengladbach",
  "borussia monchengladbach": "borussia-monchengladbach",
  "sporting gijon": "sporting-gijon",
  "deportivo la coruna": "deportivo-la-coruna",
  "atletico de madrid": "atletico-madrid",
  "atletico madrid": "atletico-madrid",
  "olympique de marseille": "marseille",
  "om": "marseille",
  "olympique marseille": "marseille",
  "olympique lyonnais": "lyon",
  "olympique de lyon": "lyon",
  "manchester city": "manchester-city",
  "manchester united": "manchester-united",
  "tottenham hotspur": "tottenham",
  "newcastle united": "newcastle-united",
  "st pauli": "st-pauli",
  "hertha bsc": "hertha-berlin",
  "sv werder bremen": "werder-bremen",
  "werder bremen": "werder-bremen",
  "vfb stuttgart": "stuttgart",
  "vfl wolfsburg": "wolfsburg",
  "1 fc koln": "koln",
  "1 fc kaiserslautern": "kaiserslautern",
  "1 fc nurnberg": "nurnberg",
  "sc freiburg": "freiburg",
  "tsg hoffenheim": "hoffenheim",
  "hamburger sv": "hamburger-sv",
  "fortuna dusseldorf": "fortuna-dusseldorf",
  "hannover 96": "hannover-96",
  "vfl bochum": "bochum",
  "fsv mainz 05": "mainz-05",
  "mainz 05": "mainz-05",
  "fc augsburg": "augsburg",
  "sc internacional": "internacional",
  "sport club recife": "sport-recife",
  "athletico paranaense": "athletico-paranaense",
  "club america": "club-america",
  "chivas guadalajara": "chivas",
  "cf monterrey": "monterrey",
  "cruz azul": "cruz-azul",
  "psv eindhoven": "psv",
  "az alkmaar": "az-alkmaar",
  "besiktas jk": "besiktas",
  "galatasaray": "galatasaray",
  "fenerbahce": "fenerbahce",
  "junior barranquilla": "junior",
  "atletico nacional": "atletico-nacional",
  "once caldas": "once-caldas",
  "millonarios": "millonarios",
  "vasco da gama": "vasco-da-gama",
  "atletico mineiro": "atletico-mineiro",
  "sao paulo": "sao-paulo",
  "new york city": "new-york-city",
  "new york red bulls": "new-york-red-bulls",
  "san jose": "san-jose-earthquakes",
  "san diego fc": "san-diego-fc",
  "st louis city": "st-louis-city",
  "montreal": "cf-montreal",
  "toronto": "toronto-fc",
  "austin": "austin-fc",
  "charlotte": "charlotte-fc",
  "nashville": "nashville-sc",
  "cincinnati": "fc-cincinnati",
  "barcelona sc guayaquil": "barcelona-sc",
  "cerro porteno": "cerro-porteno",
};

// Extract Yupoo team categories from the categories page.
// Sub-cat links look like: <a href="/categories/<id>?isSubCate=true" title="..."> ... </a>
async function discoverYupooTeams() {
  const r = await fetch("https://wanfing.x.yupoo.com/categories", { headers: HEADERS });
  const html = await r.text();
  // Each sub-category link with name
  const linkPattern = /<a[^>]+href="\/categories\/(\d+)\?isSubCate=true[^"]*"[^>]*?(?:title="([^"]+)")?[^>]*>([\s\S]{0,400}?)<\/a>/g;
  const found = new Map();
  let m;
  while ((m = linkPattern.exec(html))) {
    const id = m[1];
    const titleAttr = m[2];
    const inner = m[3];
    // Try to extract name from inner text or title attribute
    let name = titleAttr;
    if (!name) {
      const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text) name = text;
    }
    if (name && !found.has(id)) found.set(id, name);
  }
  return [...found.entries()].map(([id, name]) => ({ id, name }));
}

// Add fallback: parse the homepage which has a richer category listing
async function discoverFromHomepage() {
  const r = await fetch("https://wanfing.x.yupoo.com/", { headers: HEADERS });
  const html = await r.text();
  const found = new Map();
  // Match: <a href="...categories/<id>?isSubCate=true..." ... > <span>NAME</span> ... </a>
  // Or simpler: text content inside anchor
  const anchorPattern = /href="\/categories\/(\d+)\?isSubCate=true[^"]*"[^>]*>([\s\S]{0,800}?)<\/a>/g;
  let m;
  while ((m = anchorPattern.exec(html))) {
    const id = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text && !found.has(id)) found.set(id, text);
  }
  return [...found.entries()].map(([id, name]) => ({ id, name }));
}

async function main() {
  console.log("Discovering Yupoo team categories...");
  const fromCats = await discoverYupooTeams();
  console.log(`/categories: ${fromCats.length} entries`);
  const fromHome = await discoverFromHomepage();
  console.log(`homepage:    ${fromHome.length} entries`);
  // Merge (homepage usually has more)
  const all = new Map();
  for (const e of [...fromCats, ...fromHome]) {
    if (!all.has(e.id)) all.set(e.id, e.name);
  }
  console.log(`merged:      ${all.size} entries`);

  // Load DB teams
  const dbTeams = await prisma.team.findMany({ include: { league: true } });
  console.log(`DB teams:    ${dbTeams.length}`);

  // Build normalized lookup (DB)
  const dbByNorm = new Map();
  for (const t of dbTeams) {
    dbByNorm.set(normalize(t.name), t);
    dbByNorm.set(normalize(t.slug.replace(/-/g, " ")), t);
  }

  // Build slug→team
  const dbBySlug = new Map(dbTeams.map(t => [t.slug, t]));

  function matchTeam(rawName) {
    const decoded = decodeEntities(rawName);
    const norm = normalize(decoded);
    if (!norm) return null;

    // 1) Exact alias
    if (ALIASES[norm]) {
      const t = dbBySlug.get(ALIASES[norm]);
      if (t) return { team: t, score: 100, via: "alias" };
    }

    // 2) Direct normalized lookup
    const direct = dbByNorm.get(norm);
    if (direct) return { team: direct, score: 95, via: "direct" };

    // 3) Token-overlap fuzzy match
    const yTok = tokens(decoded).filter(t => !STOP.has(t));
    if (yTok.length === 0) return null;

    let best = null;
    for (const t of dbTeams) {
      const dTok = [...tokens(t.name), ...tokens(t.slug.replace(/-/g, " "))]
        .filter(t => !STOP.has(t));
      const dSet = new Set(dTok);
      const overlap = yTok.filter(x => dSet.has(x)).length;
      if (overlap === 0) continue;
      // Score: overlap fraction, weighted by team-name length (prefer specific matches)
      const score = (overlap / Math.max(yTok.length, dTok.length)) * 50 + overlap * 10;
      if (!best || score > best.score) best = { team: t, score, via: "fuzzy" };
    }
    if (best && best.score >= 30) return best;
    return null;
  }

  const matches = [];
  const unmatched = [];
  for (const [id, name] of all) {
    const r = matchTeam(name);
    if (r) {
      matches.push({
        yupooId: id,
        yupooName: decodeEntities(name),
        slug: r.team.slug,
        dbName: r.team.name,
        league: r.team.league.slug,
        via: r.via,
        score: Math.round(r.score),
      });
    } else {
      unmatched.push({ yupooId: id, yupooName: decodeEntities(name) });
    }
  }

  console.log(`\nMatched: ${matches.length}`);
  console.log(`Unmatched: ${unmatched.length}`);

  // Write outputs
  fs.writeFileSync("scripts/yupoo-teams-matched.json", JSON.stringify(matches, null, 2));
  fs.writeFileSync("scripts/yupoo-teams-unmatched.json", JSON.stringify(unmatched, null, 2));
  console.log("\nWrote scripts/yupoo-teams-matched.json + yupoo-teams-unmatched.json");

  // Show a sample
  console.log("\nFirst 15 matches:");
  for (const m of matches.slice(0, 15)) console.log(`  ${m.yupooId.padEnd(8)} ${m.yupooName.padEnd(30)} → ${m.slug} [${m.league}]`);

  console.log("\nFirst 15 unmatched:");
  for (const u of unmatched.slice(0, 15)) console.log(`  ${u.yupooId.padEnd(8)} ${u.yupooName}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
