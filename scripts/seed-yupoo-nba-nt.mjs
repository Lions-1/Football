/**
 * Scrape + seed wanfing.x.yupoo.com's NBA + National Team categories
 * (the two parent categories the existing scraper missed).
 *
 *   National Team (id=3536632) -> ~605 albums, multi-page
 *   NBA          (id=3545572) -> ~6 albums (Luka Doncic)
 *
 * Each album becomes one Product with up to 8 proxied photo URLs.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://wanfing.x.yupoo.com/",
};

const MAX_PER_TEAM = 6;
const MAX_PHOTOS = 8;
const PRICE = 199;
const DELAY = 220;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── helpers ──────────────────────────────────────────────────────────
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
  return decodeEntities(s)
    .toLowerCase()
    .replace(/[áâàãäå]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôöõø]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return normalize(s).replace(/\s+/g, "-").slice(0, 90).replace(/(^-|-$)/g, "");
}

async function fetchHtml(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch {}
    await sleep(500 * (i + 1));
  }
  return null;
}

const ALBUM_CARD_RX =
  /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,500}?data-src="(https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/(?:small|medium|big)\.(?:jpg|jpeg|png|webp))"[\s\S]{0,500}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;

const PHOTO_DATA_SRC_RX =
  /data-(?:origin-)?src="(https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/[a-z0-9]+\.(?:jpg|jpeg|png|webp))"/gi;
const PHOTO_REGULAR_RX =
  /https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/[a-z0-9]+\.(?:jpg|jpeg|png|webp)/gi;

function parseAlbumCards(html) {
  const cards = [];
  ALBUM_CARD_RX.lastIndex = 0;
  let m;
  while ((m = ALBUM_CARD_RX.exec(html))) {
    cards.push({
      title: decodeEntities(m[1]),
      albumId: m[2],
      cover: m[3].replace(/\/(small|medium)\.jpg/, "/big.jpg"),
      n: parseInt(m[4], 10),
    });
  }
  return cards;
}

function toProxiedUrl(u) {
  const p = "https://photo.yupoo.com/";
  return typeof u === "string" && u.startsWith(p) ? "/api/img/" + u.slice(p.length) : u;
}

async function extractAlbumPhotos(albumId, fallbackCover) {
  const html = await fetchHtml(`https://wanfing.x.yupoo.com/albums/${albumId}?uid=1`);
  if (!html) return [toProxiedUrl(fallbackCover)];
  const seen = new Set();
  const out = [];
  PHOTO_DATA_SRC_RX.lastIndex = 0;
  let m;
  while ((m = PHOTO_DATA_SRC_RX.exec(html))) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  if (out.length === 0) {
    PHOTO_REGULAR_RX.lastIndex = 0;
    for (const x of html.matchAll(PHOTO_REGULAR_RX)) {
      if (/icons|logo/i.test(x[0])) continue;
      if (!seen.has(x[0])) {
        seen.add(x[0]);
        out.push(x[0]);
      }
    }
  }
  return (out.length ? out : [fallbackCover]).map(toProxiedUrl);
}

async function fetchAllAlbums(categoryId, label) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const html = await fetchHtml(`https://wanfing.x.yupoo.com/categories/${categoryId}?page=${page}`);
    if (!html) break;
    const cards = parseAlbumCards(html);
    if (cards.length === 0) break;
    all.push(...cards);
    console.log(`  ${label} page ${page}: +${cards.length} (total ${all.length})`);
    if (cards.length < 120) break;
    await sleep(DELAY);
  }
  return all;
}

// ─── National Team detection ──────────────────────────────────────────
// DB slug -> array of normalised aliases that may appear in the album title.
// Order matters: longer/more-specific first.
const COUNTRY_ALIASES = {
  "saudi-arabia": ["saudi arabia", "saudi"],
  "south-korea": ["south korea", "korea"],
  "argentina":   ["argentina"],
  "australia":   ["australia"],
  "belgium":     ["belgium"],
  "brazil":      ["brazil", "brasil"],
  "cameroon":    ["cameroon"],
  "canada":      ["canada"],
  "colombia":    ["colombia"],
  "croatia":     ["croatia"],
  "denmark":     ["denmark"],
  "ecuador":     ["ecuador"],
  "egypt":       ["egypt"],
  "england":     ["england"],
  "france":      ["france"],
  "germany":     ["germany", "deutschland"],
  "ghana":       ["ghana"],
  "italy":       ["italy", "italia"],
  "japan":       ["japan"],
  "mexico":      ["mexico"],
  "morocco":     ["morocco", "marruecos"],
  "netherlands": ["netherlands", "holland"],
  "nigeria":     ["nigeria"],
  "poland":      ["poland"],
  "portugal":    ["portugal"],
  "scotland":    ["scotland"],
  "senegal":     ["senegal"],
  "serbia":      ["serbia"],
  "spain":       ["spain", "espana"],
  "switzerland": ["switzerland"],
  "tunisia":     ["tunisia"],
  "turkey":      ["turkey", "turkiye"],
  "usa":         ["usa", "united states", "u s a "],
  "uruguay":     ["uruguay"],
  "wales":       ["wales"],
  "algeria":     ["algeria"],
};

function detectCountry(title) {
  const n = " " + normalize(title) + " ";
  // Build (slug, alias) pairs sorted by alias length desc
  const pairs = Object.entries(COUNTRY_ALIASES).flatMap(([slug, aliases]) => aliases.map((a) => [slug, a]));
  pairs.sort((a, b) => b[1].length - a[1].length);
  for (const [slug, alias] of pairs) {
    if (n.includes(" " + alias + " ")) return slug;
  }
  return null;
}

function detectVariant(title) {
  const n = normalize(title);
  let v = "home";
  if (/\baway\b/.test(n)) v = "away";
  else if (/\bthird\b/.test(n)) v = "third";
  else if (/\bgk\b|\bgoalkeeper\b/.test(n)) v = "gk";
  else if (/\btraining\b/.test(n)) v = "training";
  if (/\bkid|\byouth\b/.test(n)) v = `kids-${v}`;
  if (/long.?sleeve/.test(n)) v += "-ls";
  if (/player.?(version|edition)|slim.?fit|authentic/.test(n)) v += "-player";
  if (/\bwomen|\bgirl|\blady/.test(n)) v = `women-${v}`;
  return v;
}

function detectCategory(title) {
  const n = normalize(title);
  if (/retro/.test(n)) return "retro";
  if (/long.?sleeve/.test(n)) return "long-sleeve";
  if (/\bkid|\byouth\b/.test(n)) return "kids";
  if (/track.?suit|tracksuit/.test(n)) return "tracksuit";
  if (/windbreaker|jacket/.test(n)) return "jacket";
  return "jersey";
}

function detectSeason(title) {
  const n = normalize(title);
  const m = n.match(/\b(20\d\d)\s*(\d\d)\b|\b(2026.?27|2025.?26|26.?27|25.?26)\b/);
  if (!m) return "2025/26";
  return m[1] ? `${m[1]}/${m[2]}` : m[3].replace(/(\d{2,4})\D+(\d{2})/, "$1/$2");
}

// ─── NBA detection ───────────────────────────────────────────────────
const NBA_PLAYER_TO_TEAM = {
  "luka doncic":      "los-angeles-lakers", // traded Feb 2025
  "lebron":           "los-angeles-lakers",
  "anthony davis":    "dallas-mavericks",
  "stephen curry":    "golden-state-warriors",
  "draymond":         "golden-state-warriors",
  "klay thompson":    "dallas-mavericks",
  "jayson tatum":     "boston-celtics",
  "jaylen brown":     "boston-celtics",
  "giannis":          "milwaukee-bucks",
  "antetokounmpo":    "milwaukee-bucks",
  "joel embiid":      "philadelphia-76ers",
  "nikola jokic":     "denver-nuggets",
  "shai gilgeous":    "oklahoma-city-thunder",
  "jimmy butler":     "miami-heat",
  "kyrie irving":     "dallas-mavericks",
  "kevin durant":     "phoenix-suns",
  "michael jordan":   "chicago-bulls",
  "kobe bryant":      "los-angeles-lakers",
  "victor wembanyama":"san-antonio-spurs",
  "wembanyama":       "san-antonio-spurs",
  "paolo banchero":   "atlanta-hawks", // sample fallback
  "trae young":       "atlanta-hawks",
  "donovan mitchell": "cleveland-cavaliers",
  "ja morant":        "memphis-grizzlies",
  "kawhi":            "los-angeles-clippers",
  "jamal murray":     "denver-nuggets",
  "anthony edwards":  "minnesota-timberwolves",
};

function detectNBATeam(title) {
  const n = normalize(title);
  for (const [name, slug] of Object.entries(NBA_PLAYER_TO_TEAM)) {
    if (n.includes(name)) return slug;
  }
  return null;
}

// ─── seeding ─────────────────────────────────────────────────────────
async function seedAlbums(albums, leagueSlug, detectFn, label) {
  const dbTeams = await prisma.team.findMany({
    where: { league: { slug: leagueSlug } },
    select: { id: true, slug: true, name: true },
  });
  const slugToId = Object.fromEntries(dbTeams.map((t) => [t.slug, t.id]));

  // Bucket: keep top MAX_PER_TEAM per team, prefer albums with >=4 photos
  const bucketByTeam = new Map(); // team -> array of selected albums

  // Score albums: prefer current season, more photos, exclude size charts
  const scored = albums
    .filter((a) => {
      const n = normalize(a.title);
      if (a.n < 2) return false;
      if (/(size|key.?chain|scarf|pin|lanyard|patch chart|chart|sticker)/.test(n)) return false;
      return true;
    })
    .map((a) => {
      const n = normalize(a.title);
      let s = 0;
      if (/2026.?27|26.?27/.test(n)) s += 30;
      if (/2025.?26|25.?26/.test(n)) s += 22;
      if (/world cup 2026|copa do mundo|mundial 2026/.test(n)) s += 15;
      if (/\bhome\b|principal|domicile/.test(n)) s += 10;
      if (/\baway\b|alternativa|visitante/.test(n)) s += 9;
      if (/\bthird\b/.test(n)) s += 7;
      if (/training/.test(n)) s += 4;
      if (/player.?(version|edition)/.test(n)) s += 6;
      if (a.n >= 8) s += 3;
      if (/retro\s+(19|200[0-9]|201[0-5])/.test(n)) s -= 30;
      return { ...a, score: s };
    })
    .sort((a, b) => b.score - a.score);

  for (const card of scored) {
    const team = detectFn(card.title);
    if (!team) continue;
    if (!slugToId[team]) continue; // not in DB
    const arr = bucketByTeam.get(team) || [];
    if (arr.length >= MAX_PER_TEAM) continue;
    // Variant dedup within a team
    const v = detectVariant(card.title);
    if (arr.some((c) => detectVariant(c.title) === v)) continue;
    arr.push(card);
    bucketByTeam.set(team, arr);
  }

  console.log(`\n[${label}] Bucketed ${[...bucketByTeam.values()].reduce((a, b) => a + b.length, 0)} candidate albums across ${bucketByTeam.size} teams.`);

  let created = 0, skipped = 0;
  for (const [team, cards] of bucketByTeam) {
    const teamId = slugToId[team];
    for (const card of cards) {
      const prodSlug = slugify(`yupoo-${team}-${card.albumId}`);
      const exists = await prisma.product.findUnique({ where: { slug: prodSlug } });
      if (exists) {
        skipped++;
        continue;
      }
      await sleep(DELAY);
      const photos = (await extractAlbumPhotos(card.albumId, card.cover)).slice(0, MAX_PHOTOS);
      if (photos.length === 0) continue;

      try {
        await prisma.product.create({
          data: {
            name: card.title.replace(/\s+/g, " ").trim(),
            slug: prodSlug,
            price: PRICE,
            images: JSON.stringify(photos),
            sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
            teamId,
            category: detectCategory(card.title),
            season: detectSeason(card.title),
            surCommande: true,
            featured: false,
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }
    console.log(`  ${team.padEnd(28)} +${cards.length}`);
  }

  console.log(`\n[${label}] created=${created}, skipped=${skipped}`);
  return created;
}

// ─── main ────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Wanfing Yupoo: NBA + National Team scrape ===\n");

  console.log("--- National Team (id=3536632) ---");
  const ntAlbums = await fetchAllAlbums("3536632", "NT");
  console.log(`Total NT albums fetched: ${ntAlbums.length}`);
  await seedAlbums(ntAlbums, "national-teams", detectCountry, "NT");

  console.log("\n--- NBA (id=3545572) ---");
  const nbaAlbums = await fetchAllAlbums("3545572", "NBA");
  console.log(`Total NBA albums fetched: ${nbaAlbums.length}`);
  await seedAlbums(nbaAlbums, "nba", detectNBATeam, "NBA");

  // Final report
  console.log("\n=== FINAL COVERAGE ===");
  for (const slug of ["national-teams", "nba"]) {
    const teams = await prisma.team.findMany({
      where: { league: { slug } },
      select: { name: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    const filled = teams.filter((t) => t._count.products > 0).length;
    console.log(`\n${slug}: ${filled}/${teams.length} teams with products`);
    for (const t of teams) console.log(`  ${t.name.padEnd(28)} ${t._count.products}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
