/**
 * Probe wanfing.x.yupoo.com to find:
 *   - The correct NBA category ID(s)
 *   - Available national-team sub-categories (so we can map them to our DB)
 */
import fs from "fs";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://wanfing.x.yupoo.com/",
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
  return r.ok ? await r.text() : null;
}

// Capture every /categories/<id> link, with or without isSubCate
function extractAllCategories(html) {
  const found = new Map();
  // Pattern A: anchor with href first, then text inside
  const rxA = /href="\/categories\/(\d+)(?:\?[^"]*)?"[^>]*>([\s\S]{0,400}?)<\/a>/g;
  let m;
  while ((m = rxA.exec(html))) {
    const id = m[1];
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text && !found.has(id)) found.set(id, text);
  }
  // Pattern B: title attribute
  const rxB = /href="\/categories\/(\d+)(?:\?[^"]*)?"[^>]*title="([^"]+)"/g;
  while ((m = rxB.exec(html))) {
    const id = m[1];
    const t = decodeEntities(m[2]);
    if (t && !found.has(id)) found.set(id, t);
  }
  return [...found.entries()].map(([id, name]) => ({ id, name }));
}

const PAGES = [
  "https://wanfing.x.yupoo.com/",
  "https://wanfing.x.yupoo.com/categories",
];

console.log("Fetching wanfing pages...\n");
const merged = new Map();
for (const url of PAGES) {
  const html = await fetchHtml(url);
  if (!html) {
    console.log(`  ${url} -> FAIL`);
    continue;
  }
  const cats = extractAllCategories(html);
  console.log(`  ${url} -> ${cats.length} categories`);
  for (const c of cats) if (!merged.has(c.id)) merged.set(c.id, c.name);
}
console.log(`\nMerged total: ${merged.size}\n`);

const all = [...merged.entries()].map(([id, name]) => ({ id, name }));

// Also scan for NBA player names like luka / lebron / curry / jordan as headings on the homepage
const nbaPlayers =
  /\b(luka|doncic|lebron|curry|jordan|kobe|jokic|giannis|durant|kyrie|tatum|booker|mitchell|haliburton|edwards|brunson|wembanyama)\b/i;

const nbaIsh = all.filter((c) => /\b(nba|basketball|jordan|kobe|laker|warrior|bull|celtic|knick|heat|mavericks|thunder|spurs|nuggets|grizzlies|raptor|nets|suns|sixers|76ers|hawks|cavaliers|clippers|rockets|jazz|wizards|kings|hornets|magic|pistons|pacers|timberwolves|trail|blazers)\b/i.test(c.name) || nbaPlayers.test(c.name));
const natIsh = all.filter((c) =>
  /\b(argentina|france|germany|portugal|england|spain|italy|netherlands|belgium|croatia|japan|korea|morocco|senegal|mexico|colombia|uruguay|serbia|poland|switzerland|denmark|nigeria|ghana|cameroon|turkey|tunisia|algeria|egypt|scotland|wales|usa|canada|saudi|australia|ecuador|national team)\b/i.test(c.name),
);

console.log(`NBA-ish (${nbaIsh.length}):`);
for (const x of nbaIsh) console.log(`  ${x.id.padEnd(8)} ${x.name}`);

console.log(`\nNational-team-ish (${natIsh.length}):`);
for (const x of natIsh) console.log(`  ${x.id.padEnd(8)} ${x.name}`);

fs.writeFileSync(
  "scripts/wanfing-categories.json",
  JSON.stringify({ all, nbaIsh, natIsh }, null, 2),
);
console.log("\nWrote scripts/wanfing-categories.json");
