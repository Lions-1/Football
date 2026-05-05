/**
 * Probe https://xingkong-sports.x.yupoo.com to discover:
 *  - Top-level categories (NBA / National Team / leagues / etc.)
 *  - Language of album titles (English / Chinese / mixed)
 *  - Pagination behaviour
 */
import fs from "fs";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,zh;q=0.7",
  Referer: "https://xingkong-sports.x.yupoo.com/",
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

async function fetchHtml(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) {
    console.log(`  HTTP ${r.status} -> ${url}`);
    return null;
  }
  return await r.text();
}

const ALBUM_RX =
  /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,500}?data-src="(https:\/\/photo\.yupoo\.com\/[a-z0-9-]+\/[a-z0-9]+\/(?:small|medium|big)\.(?:jpg|jpeg|png|webp))"[\s\S]{0,500}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;

const CAT_RX = /href="\/categories\/(\d+)(?:\?[^"]*)?"[^>]*>([\s\S]{0,400}?)<\/a>/g;

function extractCats(html) {
  const out = new Map();
  CAT_RX.lastIndex = 0;
  let m;
  while ((m = CAT_RX.exec(html))) {
    const id = m[1];
    const name = decodeEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (name && !out.has(id)) out.set(id, name);
  }
  return [...out.entries()].map(([id, name]) => ({ id, name }));
}

function extractAlbums(html) {
  ALBUM_RX.lastIndex = 0;
  const out = [];
  let m;
  while ((m = ALBUM_RX.exec(html))) {
    out.push({
      title: decodeEntities(m[1]),
      albumId: m[2],
      cover: m[3],
      n: parseInt(m[4], 10),
    });
  }
  return out;
}

const PAGES = [
  "https://xingkong-sports.x.yupoo.com/",
  "https://xingkong-sports.x.yupoo.com/albums?tab=gallery",
  "https://xingkong-sports.x.yupoo.com/categories",
];

console.log("=== Probing xingkong-sports.x.yupoo.com ===\n");

let bestHtml = "";
for (const url of PAGES) {
  const html = await fetchHtml(url);
  if (!html) continue;
  const cats = extractCats(html);
  const albums = extractAlbums(html);
  console.log(`${url}`);
  console.log(`  categories: ${cats.length}, albums: ${albums.length}`);
  if (html.length > bestHtml.length) bestHtml = html;
}

const cats = extractCats(bestHtml);
const albums = extractAlbums(bestHtml);

// Categorize by language pattern
function classify(name) {
  const hasChinese = /[\u4e00-\u9fff]/.test(name);
  const hasEnglish = /[a-zA-Z]/.test(name);
  if (hasChinese && hasEnglish) return "mixed";
  if (hasChinese) return "chinese";
  if (hasEnglish) return "english";
  return "other";
}

const byLang = { chinese: 0, english: 0, mixed: 0, other: 0 };
for (const c of cats) byLang[classify(c.name)]++;
console.log(`\nCategory languages: ${JSON.stringify(byLang)}`);

const albumLang = { chinese: 0, english: 0, mixed: 0, other: 0 };
for (const a of albums) albumLang[classify(a.title)]++;
console.log(`Album title languages: ${JSON.stringify(albumLang)}`);

// Show all categories (we want to see NBA + national-team groups)
console.log("\n--- ALL CATEGORIES ---");
for (const c of cats) console.log(`  ${c.id.padEnd(10)} ${c.name}`);

console.log("\n--- FIRST 30 ALBUM TITLES ---");
for (const a of albums.slice(0, 30)) {
  console.log(`  ${a.albumId.padEnd(11)} (${a.n}p) ${a.title.slice(0, 80)}`);
}

fs.writeFileSync(
  "scripts/xingkong-probe.json",
  JSON.stringify({ cats, albums: albums.slice(0, 50) }, null, 2),
);
console.log("\nWrote scripts/xingkong-probe.json");
