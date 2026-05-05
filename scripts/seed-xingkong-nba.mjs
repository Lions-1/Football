/**
 * Scrape + seed all 30 NBA teams from xingkong-sports.x.yupoo.com.
 *
 * - Per-team yupoo category page → up to 2 pages of albums (240 candidates).
 * - Albums are scored (current season + edition + photo count) and capped per team.
 * - Chinese titles translated to English via a hand-built vocabulary map
 *   (team names, edition labels, variant terms, common player names).
 * - Adds the 10 NBA teams missing from our DB (Hornets, Pistons, Pacers, etc.).
 * - Photos are stored as `/api/img/xingkong-sports/<hash>/<file>.jpg` proxy URLs.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,zh;q=0.7",
  Referer: "https://xingkong-sports.x.yupoo.com/",
};

const MAX_PER_TEAM = 6;
const MAX_PHOTOS = 8;
const PRICE = 199;
const DELAY = 220;
const PAGES_PER_TEAM = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── helpers ────────────────────────────────────────────────────────
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

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
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

const ALBUM_RX =
  /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,500}?data-src="(https:\/\/photo\.yupoo\.com\/[a-z0-9-]+\/[a-z0-9]+\/(?:small|medium|big)\.(?:jpg|jpeg|png|webp))"[\s\S]{0,500}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;

const PHOTO_DATA_SRC_RX =
  /data-(?:origin-)?src="(https:\/\/photo\.yupoo\.com\/[a-z0-9-]+\/[a-z0-9]+\/[a-z0-9]+\.(?:jpg|jpeg|png|webp))"/gi;

function parseAlbums(html) {
  ALBUM_RX.lastIndex = 0;
  const out = [];
  let m;
  while ((m = ALBUM_RX.exec(html))) {
    out.push({
      title: decodeEntities(m[1]),
      albumId: m[2],
      cover: m[3].replace(/\/(small|medium)\.jpg/, "/big.jpg"),
      n: parseInt(m[4], 10),
    });
  }
  return out;
}

function toProxiedUrl(u) {
  const p = "https://photo.yupoo.com/";
  return typeof u === "string" && u.startsWith(p) ? "/api/img/" + u.slice(p.length) : u;
}

async function extractAlbumPhotos(albumId, fallbackCover) {
  const html = await fetchHtml(`https://xingkong-sports.x.yupoo.com/albums/${albumId}?uid=1`);
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
  return (out.length ? out : [fallbackCover]).map(toProxiedUrl);
}

// ─── NBA team registry ──────────────────────────────────────────────
// xingkong category id → { slug, name, en }
// `en` is the English city/team name we extract from titles for translation.
const NBA_TEAMS = [
  { yId: "3359577", slug: "los-angeles-lakers",    name: "Los Angeles Lakers",    cn: "湖人" },
  { yId: "3359584", slug: "boston-celtics",        name: "Boston Celtics",        cn: "凯尔特人" },
  { yId: "3360232", slug: "memphis-grizzlies",     name: "Memphis Grizzlies",     cn: "灰熊" },
  { yId: "3360233", slug: "houston-rockets",       name: "Houston Rockets",       cn: "火箭" },
  { yId: "3362932", slug: "denver-nuggets",        name: "Denver Nuggets",        cn: "掘金" },
  { yId: "3363276", slug: "miami-heat",            name: "Miami Heat",            cn: "热火" },
  { yId: "3377104", slug: "brooklyn-nets",         name: "Brooklyn Nets",         cn: "篮网" },
  { yId: "3389344", slug: "chicago-bulls",         name: "Chicago Bulls",         cn: "公牛" },
  { yId: "3398324", slug: "golden-state-warriors", name: "Golden State Warriors", cn: "勇士" },
  { yId: "3410864", slug: "los-angeles-clippers",  name: "Los Angeles Clippers",  cn: "快船" },
  { yId: "3415878", slug: "philadelphia-76ers",    name: "Philadelphia 76ers",    cn: "76人" },
  { yId: "3425712", slug: "milwaukee-bucks",       name: "Milwaukee Bucks",       cn: "雄鹿" },
  { yId: "3435558", slug: "dallas-mavericks",      name: "Dallas Mavericks",      cn: "独行侠" },
  { yId: "3435559", slug: "phoenix-suns",          name: "Phoenix Suns",          cn: "太阳" },
  { yId: "3452967", slug: "charlotte-hornets",     name: "Charlotte Hornets",     cn: "黄蜂" },
  { yId: "3464678", slug: "utah-jazz",             name: "Utah Jazz",             cn: "爵士" },
  { yId: "3471106", slug: "portland-trail-blazers", name: "Portland Trail Blazers", cn: "开拓者" },
  { yId: "3471113", slug: "san-antonio-spurs",     name: "San Antonio Spurs",     cn: "马刺" },
  { yId: "3475056", slug: "atlanta-hawks",         name: "Atlanta Hawks",         cn: "老鹰" },
  { yId: "3491511", slug: "toronto-raptors",       name: "Toronto Raptors",       cn: "猛龙" },
  { yId: "3508651", slug: "new-york-knicks",       name: "New York Knicks",       cn: "尼克斯" },
  { yId: "3516794", slug: "cleveland-cavaliers",   name: "Cleveland Cavaliers",   cn: "骑士" },
  { yId: "3709634", slug: "minnesota-timberwolves", name: "Minnesota Timberwolves", cn: "森林狼" },
  { yId: "3716044", slug: "oklahoma-city-thunder", name: "Oklahoma City Thunder", cn: "雷霆" },
  { yId: "3743373", slug: "sacramento-kings",      name: "Sacramento Kings",      cn: "国王" },
  { yId: "3790831", slug: "detroit-pistons",       name: "Detroit Pistons",       cn: "活塞" },
  { yId: "3800324", slug: "washington-wizards",    name: "Washington Wizards",    cn: "奇才" },
  { yId: "3803338", slug: "orlando-magic",         name: "Orlando Magic",         cn: "魔术" },
  { yId: "3872922", slug: "new-orleans-pelicans",  name: "New Orleans Pelicans",  cn: "鹈鹕" },
  { yId: "4088443", slug: "indiana-pacers",        name: "Indiana Pacers",        cn: "步行者" },
];

// ─── Chinese → English vocabulary ───────────────────────────────────
// Order matters within sections: longest/most-specific first.
const TEAM_CN = {
  "湖人队": "Lakers", "湖人": "Lakers",
  "凯尔特人队": "Celtics", "凯尔特人": "Celtics", "绿军": "Celtics",
  "灰熊队": "Grizzlies", "灰熊": "Grizzlies",
  "火箭队": "Rockets", "火箭": "Rockets",
  "掘金队": "Nuggets", "掘金": "Nuggets",
  "热火队": "Heat", "热火": "Heat",
  "篮网队": "Nets", "篮网": "Nets",
  "公牛队": "Bulls", "公牛": "Bulls",
  "勇士队": "Warriors", "勇士": "Warriors",
  "快船队": "Clippers", "快船": "Clippers",
  "76人队": "76ers", "76人": "76ers",
  "雄鹿队": "Bucks", "雄鹿": "Bucks",
  "独行侠队": "Mavericks", "独行侠": "Mavericks", "小牛队": "Mavericks", "小牛": "Mavericks",
  "太阳队": "Suns", "太阳": "Suns",
  "黄蜂队": "Hornets", "黄蜂": "Hornets",
  "爵士队": "Jazz", "爵士": "Jazz",
  "开拓者队": "Trail Blazers", "开拓者": "Trail Blazers",
  "马刺队": "Spurs", "马刺": "Spurs",
  "老鹰队": "Hawks", "老鹰": "Hawks",
  "猛龙队": "Raptors", "猛龙": "Raptors",
  "尼克斯队": "Knicks", "尼克斯": "Knicks",
  "骑士队": "Cavaliers", "骑士": "Cavaliers",
  "森林狼队": "Timberwolves", "森林狼": "Timberwolves",
  "雷霆队": "Thunder", "雷霆": "Thunder",
  "国王队": "Kings", "国王": "Kings",
  "活塞队": "Pistons", "活塞": "Pistons",
  "奇才队": "Wizards", "奇才": "Wizards",
  "魔术队": "Magic", "魔术": "Magic",
  "鹈鹕队": "Pelicans", "鹈鹕": "Pelicans",
  "步行者队": "Pacers", "步行者": "Pacers",
};

const EDITION_CN = {
  "城市版": "City Edition",
  "图腾版": "Icon Edition",
  "声明版": "Statement Edition",
  "经典版": "Classic Edition",
  "联盟版": "Association Edition",
  "复古版": "Hardwood Classics",
  "圣诞版": "Christmas Edition",
  "圣诞": "Christmas",
  "75周年": "75th Anniversary",
  "全明星": "All Star",
  "城市": "City",
  "复古": "Retro",
  "经典": "Classic",
  "限定": "Limited",
  "新赛季": "New Season",
  "退役版": "Retirement",
  "退役": "Retirement",
  "亚洲版": "Asia Edition",
  "中国年": "Chinese New Year",
  "纪念版": "Commemorative",
  "纪念": "Commemorative",
  "训练": "Training",
  "热身": "Warm-up",
  "特别版": "Special Edition",
  "球员版": "Player Version",
  "球迷版": "Fan Version",
};

const VARIANT_CN = {
  "主场": "Home",
  "客场": "Away",
  "第二客场": "Second Away",
  "第三客场": "Third Away",
  "黑色": "Black",
  "白色": "White",
  "蓝色": "Blue",
  "红色": "Red",
  "黄色": "Yellow",
  "绿色": "Green",
  "紫色": "Purple",
  "金色": "Gold",
  "银色": "Silver",
  "粉色": "Pink",
  "橙色": "Orange",
};

const ITEM_CN = {
  "球衣": "Jersey",
  "球裤": "Shorts",
  "球员版球裤": "Player Shorts",
  "球迷版球裤": "Swingman Shorts",
  "短袖": "Short Sleeve",
  "长袖": "Long Sleeve",
  "T恤": "T-Shirt",
  "卫衣": "Hoodie",
  "夹克": "Jacket",
  "外套": "Jacket",
  "套装": "Set",
  "童装": "Kids",
  "儿童": "Kids",
  "女款": "Women",
  "女装": "Women",
  "背心": "Tank Top",
  "出场服": "Warm-up",
  "训练服": "Training Kit",
  "运动裤": "Pants",
};

// Common NBA player names (Chinese → English). Long list, longest-first.
const PLAYER_CN = {
  "詹姆斯": "James",
  "勒布朗": "LeBron",
  "科比": "Kobe",
  "乔丹": "Jordan",
  "库里": "Curry",
  "杜兰特": "Durant",
  "字母哥": "Antetokounmpo",
  "约基奇": "Jokic",
  "东契奇": "Doncic",
  "塔图姆": "Tatum",
  "布朗": "Brown",
  "巴特勒": "Butler",
  "恩比德": "Embiid",
  "亚历山大": "Gilgeous-Alexander",
  "亚伯山大": "Gilgeous-Alexander",
  "特雷·杨": "Trae Young",
  "特雷扬": "Trae Young",
  "詹姆斯·哈登": "Harden",
  "哈登": "Harden",
  "欧文": "Irving",
  "保罗": "Paul",
  "威斯布鲁克": "Westbrook",
  "韦斯布鲁克": "Westbrook",
  "莫兰特": "Morant",
  "锡安": "Zion",
  "威廉森": "Williamson",
  "拉文": "LaVine",
  "米切尔": "Mitchell",
  "唐西奇": "Doncic",
  "约克伊奇": "Jokic",
  "戴维斯": "Davis",
  "霍华德": "Howard",
  "格林": "Green",
  "克莱": "Klay",
  "汤普森": "Thompson",
  "布克": "Booker",
  "布尔甘": "Bourgan",
  "维金斯": "Wiggins",
  "巴恩斯": "Barnes",
  "西亚卡姆": "Siakam",
  "范弗利特": "VanVleet",
  "本·西蒙斯": "Simmons",
  "西蒙斯": "Simmons",
  "希尔": "Hill",
  "比斯利": "Beasley",
  "科比·怀特": "White",
  "怀特": "White",
  "拉文": "LaVine",
  "罗斯": "Rose",
  "伊曼纽尔": "Quickley",
  "奎克利": "Quickley",
  "奎因·库克": "Cook",
  "卡梅隆·托马斯": "Cameron Thomas",
  "汤马斯": "Thomas",
  "杰伦·布朗": "Jaylen Brown",
  "波尔津吉斯": "Porzingis",
  "波尔金吉斯": "Porzingis",
  "霍勒迪": "Holiday",
  "怀特海德": "Whitehead",
  "巴伦": "Bron",
  "布朗尼": "Bronny",
  "维杰克": "Vucevic",
  "瓦塞尔": "Vassell",
  "罗素": "Russell",
  "拉塞尔": "Russell",
  "贝弗利": "Beverley",
  "唐斯": "Towns",
  "卡尔安东尼·唐斯": "Karl-Anthony Towns",
  "赫尔伯特": "Herbert",
  "麦考伦": "McCollum",
  "里拉德": "Lillard",
  "利拉德": "Lillard",
  "波尔特": "Porter",
  "波特": "Porter",
  "穆雷": "Murray",
  "戈登": "Gordon",
  "巴恩斯": "Barnes",
  "本西蒙斯": "Simmons",
  "霍勒迪": "Holiday",
  "申京": "Sengun",
  "范弗里特": "VanVleet",
  "贾巴里·史密斯": "Smith",
  "贾巴里史密斯": "Smith",
  "格林": "Green",
  "汤伯": "Thompson",
  "范甘迪": "Van Gundy",
  "范圭迪": "Van Gundy",
  "维克托": "Wembanyama",
  "文班": "Wembanyama",
  "文班亚马": "Wembanyama",
  "凯尔登": "Keldon",
  "约翰逊": "Johnson",
  "瓦塞尔": "Vassell",
  "卡斯尔": "Castle",
  "卡塞尔": "Castle",
  "保罗·乔治": "Paul George",
  "乔治": "George",
  "莱昂纳德": "Leonard",
  "卡哇伊": "Kawhi",
  "哈登": "Harden",
  "克莱": "Klay",
  "詹姆斯·华盛顿": "Washington",
  "亚里克斯": "Reaves",
  "里夫斯": "Reaves",
  "范德比尔特": "Vanderbilt",
  "拉塞尔": "Russell",
  "胡比": "Brunson",
  "布伦森": "Brunson",
  "波兰扎纳": "Wembanyama",
  "波尔金": "Porzingis",
  "波杰姆斯基": "Podziemski",
  "贾巴里": "Jabari",
  "杰克逊": "Jackson",
  "贾·莫兰特": "Ja Morant",
  "本西蒙森": "Simmons",
  "贝恩": "Bane",
  "亨德森": "Henderson",
  "比斯利": "Beasley",
  "拉马洛": "Ramalho",
  "巴雷特": "Barrett",
  "皮鲁": "Risacher",
};

// Sort each map's keys by length DESC for greedy replacement.
function sortedReplace(text, map) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  let out = text;
  for (const k of keys) {
    if (out.includes(k)) {
      out = out.split(k).join(" " + map[k] + " ");
    }
  }
  return out;
}

// Translate a Chinese / mixed title to English.
function translateTitle(raw) {
  let s = raw.trim();
  // Season codes: 26赛季 → 2025/26 Season, 25赛季 → 2024/25 Season, etc.
  s = s.replace(/(\d{2})\s*赛季/g, (_, y) => {
    const yr = parseInt(y, 10);
    const prev = yr - 1;
    return `20${prev.toString().padStart(2, "0")}/${y} Season`;
  });
  s = s.replace(/(\d{4})\s*赛季/g, "$1 Season");
  s = s.replace(/赛季/g, "Season");

  // Numbered jersey: e.g. 24号 → #24
  s = s.replace(/(\d{1,2})\s*号/g, "#$1");

  // Apply translation maps (order matters: editions, items, players, teams, variants, colors)
  s = sortedReplace(s, EDITION_CN);
  s = sortedReplace(s, ITEM_CN);
  s = sortedReplace(s, PLAYER_CN);
  s = sortedReplace(s, TEAM_CN);
  s = sortedReplace(s, VARIANT_CN);

  // Common standalone glyphs
  s = s.replace(/队/g, " Team")
    .replace(/版/g, "")
    .replace(/[，,]/g, " ")
    .replace(/[：:]/g, " ")
    .replace(/[／/]+/g, " / ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip any remaining non-ASCII chunks longer than 0 (Chinese leftovers)
  // and collapse double spaces.
  // Keep digits, ASCII letters, common punctuation.
  const ascii = s.replace(/[^\x20-\x7E]+/g, " ").replace(/\s+/g, " ").trim();
  return ascii || raw;
}

// ─── scoring & variant detection ────────────────────────────────────
function scoreAlbum(card) {
  const t = card.title;
  let s = 0;
  if (/26\s*赛季|2025.?26/.test(t)) s += 30;
  if (/25\s*赛季|2024.?25/.test(t)) s += 22;
  if (/城市版|城市/.test(t)) s += 15;
  if (/图腾版|声明版|经典版/.test(t)) s += 10;
  if (/复古|75周年/.test(t)) s += 6;
  if (/全明星/.test(t)) s += 4;
  if (/球员版/.test(t)) s += 5;
  if (/限定/.test(t)) s += 3;
  if (card.n >= 8) s += 4;
  if (card.n >= 12) s += 2;
  if (card.n < 4) s -= 10;
  if (/尺码|Size|key.?chain|patch chart/i.test(t)) s -= 100;
  if (/球裤|短裤|背心|t恤|长袖|帽/.test(t) && !/球衣/.test(t)) s -= 5;
  return s;
}

function detectVariant(en) {
  const n = en.toLowerCase();
  let v = "home";
  if (n.includes("away")) v = "away";
  else if (n.includes("third")) v = "third";
  else if (n.includes("city")) v = "city";
  else if (n.includes("statement")) v = "statement";
  else if (n.includes("classic")) v = "classic";
  else if (n.includes("association")) v = "association";
  else if (n.includes("icon")) v = "icon";
  else if (n.includes("christmas")) v = "christmas";
  else if (n.includes("retro") || n.includes("hardwood")) v = "retro";
  if (n.includes("kids")) v = `kids-${v}`;
  if (n.includes("women")) v = `women-${v}`;
  return v;
}

function detectCategory(en) {
  const n = en.toLowerCase();
  if (n.includes("kids")) return "kids";
  if (n.includes("retro") || n.includes("classic")) return "retro";
  if (n.includes("hoodie")) return "hoodie";
  if (n.includes("jacket")) return "jacket";
  if (n.includes("shorts")) return "shorts";
  if (n.includes("t-shirt")) return "tshirt";
  return "jersey";
}

// ─── seed missing teams ─────────────────────────────────────────────
async function ensureNBATeams() {
  const nba = await prisma.league.findUnique({ where: { slug: "nba" } });
  if (!nba) throw new Error("NBA league missing — run scrape-yupoo.mjs first");

  let added = 0;
  for (const t of NBA_TEAMS) {
    const existing = await prisma.team.findUnique({ where: { slug: t.slug } });
    if (existing) continue;
    await prisma.team.create({
      data: {
        name: t.name,
        slug: t.slug,
        logo: `https://logo.clearbit.com/nba.com/${t.slug.split("-").pop()}`,
        leagueId: nba.id,
      },
    });
    added++;
  }
  if (added > 0) console.log(`+ Added ${added} missing NBA teams`);
}

// ─── per-team scrape ────────────────────────────────────────────────
async function scrapeTeam(team) {
  const all = [];
  for (let page = 1; page <= PAGES_PER_TEAM; page++) {
    const html = await fetchHtml(`https://xingkong-sports.x.yupoo.com/categories/${team.yId}?page=${page}`);
    if (!html) break;
    const cards = parseAlbums(html);
    if (cards.length === 0) break;
    all.push(...cards);
    if (cards.length < 120) break;
    await sleep(DELAY);
  }

  const dbTeam = await prisma.team.findUnique({ where: { slug: team.slug } });
  if (!dbTeam) return { slug: team.slug, scanned: all.length, added: 0 };

  // Score and pick top per variant
  const scored = all
    .map((c) => ({ ...c, score: scoreAlbum(c) }))
    .filter((c) => c.score > -50 && c.n >= 2)
    .sort((a, b) => b.score - a.score);

  const seenVariants = new Set();
  const picks = [];
  for (const c of scored) {
    if (picks.length >= MAX_PER_TEAM) break;
    const en = translateTitle(c.title);
    const variant = detectVariant(en);
    if (seenVariants.has(variant) && picks.length >= 3) continue;
    seenVariants.add(variant);
    picks.push({ ...c, en, variant });
  }

  let added = 0;
  for (const card of picks) {
    const prodSlug = slugify(`xingkong-${team.slug}-${card.albumId}`);
    const exists = await prisma.product.findUnique({ where: { slug: prodSlug } });
    if (exists) continue;

    await sleep(DELAY);
    const photos = (await extractAlbumPhotos(card.albumId, card.cover)).slice(0, MAX_PHOTOS);
    if (photos.length === 0) continue;

    // Build a clean product name: "<Team> <Edition> Jersey #<num> <player>"
    let name = card.en.trim();
    // If team name not present, prepend it
    const teamLast = team.name.split(" ").pop();
    if (!new RegExp(teamLast, "i").test(name)) name = `${teamLast} ${name}`;
    // Trim runaway whitespace and trailing punctuation
    name = name.replace(/\s{2,}/g, " ").replace(/[\s\-,;]+$/, "").trim();
    if (name.length < 6) name = `${team.name} Jersey ${card.albumId}`;

    try {
      await prisma.product.create({
        data: {
          name,
          slug: prodSlug,
          price: PRICE,
          images: JSON.stringify(photos),
          sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
          teamId: dbTeam.id,
          category: detectCategory(card.en),
          season: /26.?Season/.test(card.en) ? "2025/26" : /25.?Season/.test(card.en) ? "2024/25" : "2025/26",
          surCommande: true,
          featured: false,
        },
      });
      added++;
    } catch {}
  }
  return { slug: team.slug, scanned: all.length, picked: picks.length, added };
}

// ─── main ───────────────────────────────────────────────────────────
async function main() {
  console.log("=== xingkong-sports.x.yupoo.com NBA scrape ===\n");

  await ensureNBATeams();

  let total = 0;
  for (const team of NBA_TEAMS) {
    const r = await scrapeTeam(team);
    total += r.added;
    console.log(`  ${team.slug.padEnd(28)} +${r.added}/${r.picked || 0} (${r.scanned} scanned)`);
    await sleep(DELAY);
  }

  console.log(`\n=== Total: ${total} new NBA products ===\n`);

  const counts = await prisma.team.findMany({
    where: { league: { slug: "nba" } },
    select: { name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  console.log("Final NBA coverage:");
  let filled = 0;
  for (const t of counts) {
    console.log(`  ${t.name.padEnd(28)} ${t._count.products}`);
    if (t._count.products > 0) filled++;
  }
  console.log(`\n${filled}/${counts.length} NBA teams have products.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
