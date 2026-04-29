/**
 * Inspect NBA category — see if it has team sub-categories or flat album list.
 */
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Referer": "https://wanfing.x.yupoo.com/",
};

const r = await fetch("https://wanfing.x.yupoo.com/categories/3545572", { headers: HEADERS });
const html = await r.text();

// Album cards: pattern from earlier probe
const cardPattern = /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,400}?data-src="(https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/(?:small|medium|big)\.(?:jpg|jpeg|png|webp))"[\s\S]{0,400}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;
const cards = [];
let m;
while ((m = cardPattern.exec(html))) {
  cards.push({ title: m[1], albumId: m[2], cover: m[3], photoCount: parseInt(m[4], 10) });
}
console.log(`NBA category — ${cards.length} albums:`);
cards.forEach(c => console.log(`  ${c.albumId.padEnd(10)}  [${c.photoCount.toString().padStart(3)} photos]  ${c.title}`));

// Also check if NBA has sub-categories (team breakdowns)
const subCatPattern = /<a[^>]+href="\/categories\/(\d+)\?isSubCate=true[^"]*"[^>]*>([\s\S]{0,500}?)<\/a>/g;
const subCats = new Set();
while ((m = subCatPattern.exec(html))) {
  const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  subCats.add(`${m[1]} | ${text}`);
}
console.log(`\nSub-category links seen: ${subCats.size}`);
[...subCats].slice(0, 30).forEach(s => console.log("  " + s));
