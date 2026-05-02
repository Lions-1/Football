/**
 * Yupoo (wanfing.x.yupoo.com) full catalog scraper.
 *
 * Pipeline:
 *  1) Seed NBA league + popular teams if missing.
 *  2) Discover Yupoo sub-categories (236 teams) → match to DB teams (alias map + fuzzy).
 *  3) For each matched team:
 *       fetch /categories/<id>?isSubCate=true → extract album cards
 *       filter (skip size charts / very old retros / accessories)
 *       fetch top-N album pages → collect every photo URL (big.jpg)
 *       create one Product per album with full multi-image gallery
 *  4) Also scrape the flat NBA category for any Doncic/etc. albums.
 *
 * All photo URLs use https://photo.yupoo.com/wanfing/<hash>/<file>.jpg
 * (whitelisted in next.config.ts).
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://wanfing.x.yupoo.com/",
};

const MAX_ALBUMS_PER_TEAM = 6;     // products per team
const MAX_PHOTOS_PER_PRODUCT = 8;  // images per product
const FIXED_PRICE_MAD = 199;
const REQUEST_DELAY_MS = 250;      // be polite to Yupoo

// ───── helpers ─────────────────────────────────────────────────────────
function decodeEntities(s) {
  return (s || "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
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

function slugify(s) {
  return normalize(s).replace(/\s+/g, "-").slice(0, 90).replace(/(^-|-$)/g, "");
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch (e) {
      if (i === retries) return null;
    }
    await sleep(500 * (i + 1));
  }
  return null;
}

// ───── alias / stop-word config ────────────────────────────────────────
const STOP = new Set([
  "fc", "cf", "sc", "ac", "de", "la", "le", "el", "los", "das", "do", "da",
  "club", "city", "united", "real", "sport", "sports", "1909",
]);

const TEAM_ALIASES = {
  "bayern munchen": "bayern-munich",
  "bayer 04 leverkusen": "bayer-leverkusen",
  "borussia m gladbach": "borussia-monchengladbach",
  "borussia mgladbach": "borussia-monchengladbach",
  "atletico de madrid": "atletico-madrid",
  "atletico madrid": "atletico-madrid",
  "olympique de marseille": "marseille",
  "olympique marseille": "marseille",
  "psg": "paris-saint-germain",
  "manchester city": "manchester-city",
  "manchester united": "manchester-united",
  "tottenham hotspur": "tottenham",
  "newcastle united": "newcastle-united",
  "inter": "inter-milan",
  "milan": "ac-milan",
  "roma": "as-roma",
  "club america": "club-america",
  "chivas guadalajara": "chivas",
  "cruz azul": "cruz-azul",
  "cf monterrey": "monterrey",
  "psv eindhoven": "psv",
  "barcelona": "fc-barcelona",
  "fc barcelona": "fc-barcelona",
  "vasco da gama": "vasco-da-gama",
  "atletico mineiro": "atletico-mineiro",
  "sao paulo": "sao-paulo",
  "athletico paranaense": "athletico-paranaense",
  "rb bragantino": "red-bull-bragantino",
  "internacional": "internacional",
  "sc internacional": "internacional",
  "sport club recife": "sport-recife",
  "fenerbahce": "fenerbahce",
  "galatasaray": "galatasaray",
  "besiktas jk": "besiktas",
  "besiktas": "besiktas",
  "atletico nacional": "atletico-nacional",
  "junior barranquilla": "junior",
};

// ───── NBA ─────────────────────────────────────────────────────────────
const NBA_TEAMS = [
  // Eastern conference
  { name: "Boston Celtics",          slug: "boston-celtics",         logo: "https://logo.clearbit.com/celtics.com" },
  { name: "Brooklyn Nets",           slug: "brooklyn-nets",          logo: "https://logo.clearbit.com/nba.com/nets" },
  { name: "New York Knicks",         slug: "new-york-knicks",        logo: "https://logo.clearbit.com/nba.com/knicks" },
  { name: "Philadelphia 76ers",      slug: "philadelphia-76ers",     logo: "https://logo.clearbit.com/nba.com/sixers" },
  { name: "Toronto Raptors",         slug: "toronto-raptors",        logo: "https://logo.clearbit.com/nba.com/raptors" },
  { name: "Chicago Bulls",           slug: "chicago-bulls",          logo: "https://logo.clearbit.com/nba.com/bulls" },
  { name: "Cleveland Cavaliers",     slug: "cleveland-cavaliers",    logo: "https://logo.clearbit.com/nba.com/cavaliers" },
  { name: "Milwaukee Bucks",         slug: "milwaukee-bucks",        logo: "https://logo.clearbit.com/nba.com/bucks" },
  { name: "Miami Heat",              slug: "miami-heat",             logo: "https://logo.clearbit.com/nba.com/heat" },
  { name: "Atlanta Hawks",           slug: "atlanta-hawks",          logo: "https://logo.clearbit.com/nba.com/hawks" },
  // Western conference
  { name: "Los Angeles Lakers",      slug: "los-angeles-lakers",     logo: "https://logo.clearbit.com/nba.com/lakers" },
  { name: "Golden State Warriors",   slug: "golden-state-warriors",  logo: "https://logo.clearbit.com/nba.com/warriors" },
  { name: "Los Angeles Clippers",    slug: "los-angeles-clippers",   logo: "https://logo.clearbit.com/nba.com/clippers" },
  { name: "Dallas Mavericks",        slug: "dallas-mavericks",       logo: "https://logo.clearbit.com/nba.com/mavericks" },
  { name: "Denver Nuggets",          slug: "denver-nuggets",         logo: "https://logo.clearbit.com/nba.com/nuggets" },
  { name: "Phoenix Suns",            slug: "phoenix-suns",           logo: "https://logo.clearbit.com/nba.com/suns" },
  { name: "Memphis Grizzlies",       slug: "memphis-grizzlies",      logo: "https://logo.clearbit.com/nba.com/grizzlies" },
  { name: "Oklahoma City Thunder",   slug: "oklahoma-city-thunder",  logo: "https://logo.clearbit.com/nba.com/thunder" },
  { name: "Houston Rockets",         slug: "houston-rockets",        logo: "https://logo.clearbit.com/nba.com/rockets" },
  { name: "San Antonio Spurs",       slug: "san-antonio-spurs",      logo: "https://logo.clearbit.com/nba.com/spurs" },
];

// Match album titles like "NBA Luka Doncic Jersey" → team slug by player name
const NBA_PLAYER_TO_TEAM = {
  "luka doncic":          "los-angeles-lakers",   // traded Feb 2025
  "lebron james":         "los-angeles-lakers",
  "anthony davis":        "dallas-mavericks",      // traded Feb 2025
  "stephen curry":        "golden-state-warriors",
  "jayson tatum":         "boston-celtics",
  "jaylen brown":         "boston-celtics",
  "giannis":              "milwaukee-bucks",
  "antetokounmpo":        "milwaukee-bucks",
  "joel embiid":          "philadelphia-76ers",
  "nikola jokic":         "denver-nuggets",
  "shai gilgeous":        "oklahoma-city-thunder",
  "jimmy butler":         "miami-heat",
  "kyrie irving":         "dallas-mavericks",
  "kevin durant":         "phoenix-suns",
  "michael jordan":       "chicago-bulls",
  "kobe bryant":          "los-angeles-lakers",
};

async function seedNBA() {
  let nba = await prisma.league.findUnique({ where: { slug: "nba" } });
  if (!nba) {
    // Place after F1 (currently order ~14)
    const max = await prisma.league.aggregate({ _max: { order: true } });
    nba = await prisma.league.create({
      data: { name: "NBA", slug: "nba", order: (max._max.order ?? 0) + 1 },
    });
    console.log(`✓ Created league NBA (id=${nba.id})`);
  }
  let added = 0;
  for (const t of NBA_TEAMS) {
    const existing = await prisma.team.findUnique({ where: { slug: t.slug } });
    if (existing) continue;
    await prisma.team.create({ data: { ...t, leagueId: nba.id } });
    added++;
  }
  console.log(`NBA seeded: +${added} teams (total ${NBA_TEAMS.length})\n`);
  return nba;
}

// ───── Yupoo discovery ────────────────────────────────────────────────
async function discoverYupooTeams() {
  // Use homepage HTML which lists every team sub-category in the nav.
  const html = await fetchHtml("https://wanfing.x.yupoo.com/");
  if (!html) throw new Error("Could not fetch Yupoo homepage");
  const found = new Map();
  const pattern = /href="\/categories\/(\d+)\?isSubCate=true[^"]*"[^>]*>([\s\S]{0,800}?)<\/a>/g;
  let m;
  while ((m = pattern.exec(html))) {
    const id = m[1];
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text && !found.has(id)) found.set(id, text);
  }
  return [...found.entries()].map(([id, name]) => ({ id, name }));
}

// ───── team matcher ──────────────────────────────────────────────────
function buildMatcher(dbTeams) {
  const dbBySlug = new Map(dbTeams.map(t => [t.slug, t]));
  const dbByNorm = new Map();
  for (const t of dbTeams) {
    dbByNorm.set(normalize(t.name), t);
    dbByNorm.set(normalize(t.slug.replace(/-/g, " ")), t);
  }
  return function match(rawName) {
    const norm = normalize(rawName);
    if (!norm) return null;
    if (TEAM_ALIASES[norm]) {
      const t = dbBySlug.get(TEAM_ALIASES[norm]);
      if (t) return t;
    }
    const direct = dbByNorm.get(norm);
    if (direct) return direct;
    const yTok = tokens(rawName).filter(t => !STOP.has(t));
    if (yTok.length === 0) return null;
    let best = null;
    for (const t of dbTeams) {
      const dTok = [...tokens(t.name), ...tokens(t.slug.replace(/-/g, " "))]
        .filter(t => !STOP.has(t));
      const dSet = new Set(dTok);
      const overlap = yTok.filter(x => dSet.has(x)).length;
      if (overlap === 0) continue;
      const score = (overlap / Math.max(yTok.length, dTok.length)) * 50 + overlap * 10;
      if (!best || score > best.score) best = { team: t, score };
    }
    return best && best.score >= 30 ? best.team : null;
  };
}

// ───── album extraction ──────────────────────────────────────────────
const ALBUM_CARD_RX =
  /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,500}?data-src="(https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/(?:small|medium|big)\.(?:jpg|jpeg|png|webp))"[\s\S]{0,500}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;

function parseAlbumCards(html) {
  const cards = [];
  let m;
  ALBUM_CARD_RX.lastIndex = 0;
  while ((m = ALBUM_CARD_RX.exec(html))) {
    cards.push({
      title: decodeEntities(m[1]),
      albumId: m[2],
      cover: m[3].replace(/\/(small|medium)\.jpg/, "/big.jpg"),
      photoCount: parseInt(m[4], 10),
    });
  }
  return cards;
}

// Score albums to prioritize current season jerseys
function scoreAlbum(title) {
  const n = normalize(title);
  let s = 0;
  if (/\b2026\s*27\b|\b26\s*27\b/.test(n)) s += 30;
  if (/\b2025\s*26\b|\b25\s*26\b/.test(n)) s += 20;
  if (/world cup 2026|copa do mundo|mundial 2026/.test(n)) s += 15;
  if (/\bnew season\b|temporada/.test(n)) s += 8;
  if (/\bhome\b|principal|domicile|casa/.test(n)) s += 10;
  if (/\baway\b|alternativa|visitante/.test(n)) s += 9;
  if (/\bthird\b|terceiro/.test(n)) s += 8;
  if (/player version|authentic/.test(n)) s += 5;
  if (/jersey/.test(n)) s += 4;
  // Penalize old retros and accessories
  if (/retro\s+(19|200[0-9]|201[0-5])/.test(n)) s -= 30;
  if (/\bretro\b/.test(n) && !/\b(1990s|199[0-9]|200[0-9])\b/.test(n)) s -= 5;
  if (/(size|keychain|key chain|scarf|pin|lanyard|patch chart|chart)/i.test(title)) s -= 100;
  if (/(short|hat|cap|sock)\s*$/.test(n)) s -= 20;
  return s;
}

// Extract every photo from a single album page
const PHOTO_DATA_SRC_RX =
  /data-(?:origin-)?src="(https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/[a-z0-9]+\.(?:jpg|jpeg|png|webp))"/gi;
const PHOTO_REGULAR_RX =
  /https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/[a-z0-9]+\.(?:jpg|jpeg|png|webp)/gi;

// Convert https://photo.yupoo.com/<path> → /api/img/<path> so the Referer-based
// hotlink protection is bypassed by our Next.js API proxy.
function toProxiedUrl(u) {
  if (typeof u !== "string") return u;
  const p = "https://photo.yupoo.com/";
  return u.startsWith(p) ? "/api/img/" + u.slice(p.length) : u;
}

async function extractAlbumPhotos(albumId, fallbackCover) {
  const html = await fetchHtml(`https://wanfing.x.yupoo.com/albums/${albumId}?uid=1`);
  if (!html) return [toProxiedUrl(fallbackCover)];
  const seen = new Set();
  const out = [];
  let m;
  PHOTO_DATA_SRC_RX.lastIndex = 0;
  while ((m = PHOTO_DATA_SRC_RX.exec(html))) {
    const url = m[1];
    if (!seen.has(url)) { seen.add(url); out.push(url); }
  }
  // Fallback: regex over plain URLs
  if (out.length === 0) {
    PHOTO_REGULAR_RX.lastIndex = 0;
    const matches = [...html.matchAll(PHOTO_REGULAR_RX)].map(x => x[0]);
    for (const u of matches) {
      if (/icons|logo/i.test(u)) continue;
      if (!seen.has(u)) { seen.add(u); out.push(u); }
    }
  }
  const final = out.length ? out : [fallbackCover];
  return final.map(toProxiedUrl);
}

// ───── per-team scrape ────────────────────────────────────────────────
async function scrapeTeam(team, yupooId) {
  const html = await fetchHtml(`https://wanfing.x.yupoo.com/categories/${yupooId}?isSubCate=true`);
  if (!html) return { team: team.slug, scanned: 0, added: 0 };
  const cards = parseAlbumCards(html);
  if (cards.length === 0) return { team: team.slug, scanned: 0, added: 0 };

  // Score + filter + sort
  const scored = cards
    .map(c => ({ ...c, score: scoreAlbum(c.title) }))
    .filter(c => c.score > -50 && c.photoCount >= 1)
    .sort((a, b) => b.score - a.score);

  const existingProducts = await prisma.product.findMany({
    where: { teamId: team.id }, select: { name: true, slug: true },
  });
  const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()));

  let added = 0;
  for (const card of scored.slice(0, MAX_ALBUMS_PER_TEAM * 2)) {
    if (added >= MAX_ALBUMS_PER_TEAM) break;
    const cleanTitle = card.title.replace(/\s+/g, " ").trim();
    if (existingNames.has(cleanTitle.toLowerCase())) continue;
    const prodSlug = slugify(`yupoo-${team.slug}-${card.albumId}`);
    const exists = await prisma.product.findUnique({ where: { slug: prodSlug } });
    if (exists) continue;

    await sleep(REQUEST_DELAY_MS);
    const photos = await extractAlbumPhotos(card.albumId, card.cover);
    const images = photos.slice(0, MAX_PHOTOS_PER_PRODUCT);
    if (images.length === 0) continue;

    // Detect season
    const seasonMatch = normalize(cleanTitle).match(/(20\d\d\s*\d\d|2026\s*27|2025\s*26|26\s*27|25\s*26)/);
    const season = seasonMatch ? seasonMatch[0].replace(/\s+/g, "/") : "2025/26";

    // Detect category (jersey/retro/long-sleeve/kids)
    const cat = /retro/i.test(cleanTitle) ? "retro"
      : /long.?sleeve/i.test(cleanTitle) ? "long-sleeve"
      : /(kid|youth)/i.test(cleanTitle) ? "kids"
      : /track\s*suit|tracksuit/i.test(cleanTitle) ? "tracksuit"
      : /windbreaker|jacket/i.test(cleanTitle) ? "jacket"
      : "jersey";

    try {
      await prisma.product.create({
        data: {
          name: cleanTitle,
          slug: prodSlug,
          price: FIXED_PRICE_MAD,
          images: JSON.stringify(images),
          sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
          teamId: team.id,
          category: cat,
          season,
          surCommande: true,
          featured: added === 0,
        },
      });
      added++;
    } catch (e) {
      // duplicate slug or constraint — ignore
    }
  }
  return { team: team.slug, scanned: cards.length, added };
}

// ───── NBA flat-category scrape ───────────────────────────────────────
async function scrapeNBAFlat(nbaLeagueId, dbTeams) {
  const html = await fetchHtml("https://wanfing.x.yupoo.com/categories/3545572");
  if (!html) return 0;
  const cards = parseAlbumCards(html);
  let added = 0;
  for (const card of cards) {
    if (scoreAlbum(card.title) <= -50) continue;
    if (card.photoCount < 2) continue;
    // Match player name → team
    const nlow = card.title.toLowerCase();
    let teamSlug = null;
    for (const [name, slug] of Object.entries(NBA_PLAYER_TO_TEAM)) {
      if (nlow.includes(name)) { teamSlug = slug; break; }
    }
    // Fallback: assign to Lakers (most popular)
    if (!teamSlug) teamSlug = "los-angeles-lakers";
    const team = dbTeams.find(t => t.slug === teamSlug);
    if (!team) continue;

    const prodSlug = slugify(`yupoo-${team.slug}-${card.albumId}`);
    const exists = await prisma.product.findUnique({ where: { slug: prodSlug } });
    if (exists) continue;

    await sleep(REQUEST_DELAY_MS);
    const photos = await extractAlbumPhotos(card.albumId, card.cover);
    const images = photos.slice(0, MAX_PHOTOS_PER_PRODUCT);
    if (images.length === 0) continue;

    try {
      await prisma.product.create({
        data: {
          name: card.title,
          slug: prodSlug,
          price: FIXED_PRICE_MAD,
          images: JSON.stringify(images),
          sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
          teamId: team.id,
          category: "jersey",
          season: "2025/26",
          surCommande: true,
          featured: added === 0,
        },
      });
      added++;
      console.log(`  ${team.slug.padEnd(26)} +1 album (${images.length} photos): ${card.title.slice(0, 60)}`);
    } catch {}
  }
  return added;
}

// ───── main ───────────────────────────────────────────────────────────
async function main() {
  console.log("=== Yupoo (wanfing.x.yupoo.com) catalog scraper ===\n");

  // 1) NBA
  await seedNBA();

  // 2) Discover Yupoo team mappings
  const yupooTeams = await discoverYupooTeams();
  console.log(`Discovered ${yupooTeams.length} Yupoo team sub-categories`);

  const dbTeams = await prisma.team.findMany({ include: { league: true } });
  const matcher = buildMatcher(dbTeams);

  const matchedPairs = [];
  for (const yt of yupooTeams) {
    const team = matcher(yt.name);
    if (team) matchedPairs.push({ yupooId: yt.id, yupooName: yt.name, team });
  }
  console.log(`Matched ${matchedPairs.length} Yupoo teams to DB teams\n`);

  // 3) Football team scrape
  let totalAdded = 0;
  let teamsTouched = 0;
  console.log("--- Scraping football teams ---");
  for (const { yupooId, yupooName, team } of matchedPairs) {
    const r = await scrapeTeam(team, yupooId);
    if (r.added > 0) {
      teamsTouched++;
      totalAdded += r.added;
      console.log(`  ${team.slug.padEnd(28)} +${r.added}/${r.scanned}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
  console.log(`\nFootball: ${teamsTouched} teams enriched, ${totalAdded} products added`);

  // 4) NBA flat-category scrape
  console.log("\n--- Scraping NBA flat category ---");
  const nbaAdded = await scrapeNBAFlat(null, dbTeams);
  console.log(`NBA: +${nbaAdded} products\n`);

  console.log(`=== TOTAL: ${totalAdded + nbaAdded} new products ===`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
