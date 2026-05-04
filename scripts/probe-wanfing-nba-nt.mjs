/**
 * Probe the NBA and National-Team category pages on wanfing.x.yupoo.com
 * to understand their structure (sub-categories vs direct album cards).
 */
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
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

const ALBUM_CARD_RX =
  /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,500}?data-src="(https:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/(?:small|medium|big)\.(?:jpg|jpeg|png|webp))"[\s\S]{0,500}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;

const SUBCAT_RX = /href="\/categories\/(\d+)(?:\?[^"]*)?"[^>]*>([\s\S]{0,400}?)<\/a>/g;

async function fetchHtml(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) {
    console.log(`  HTTP ${r.status} for ${url}`);
    return null;
  }
  return await r.text();
}

function extractAlbums(html) {
  const cards = [];
  ALBUM_CARD_RX.lastIndex = 0;
  let m;
  while ((m = ALBUM_CARD_RX.exec(html))) {
    cards.push({ title: decodeEntities(m[1]), albumId: m[2], cover: m[3], n: parseInt(m[4], 10) });
  }
  return cards;
}

function extractSubcats(html) {
  const cats = new Map();
  SUBCAT_RX.lastIndex = 0;
  let m;
  while ((m = SUBCAT_RX.exec(html))) {
    const id = m[1];
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text && !cats.has(id)) cats.set(id, text);
  }
  return [...cats.entries()].map(([id, name]) => ({ id, name }));
}

async function probe(label, id) {
  console.log(`\n=== ${label} (id=${id}) ===`);
  // Try both with isSubCate=true and without
  for (const variant of ["", "?isSubCate=true"]) {
    const url = `https://wanfing.x.yupoo.com/categories/${id}${variant}`;
    const html = await fetchHtml(url);
    if (!html) continue;
    const subcats = extractSubcats(html);
    const albums = extractAlbums(html);
    console.log(`  ${variant || "(plain)"} -> subcats=${subcats.length}, albums=${albums.length}`);
    if (variant === "" && albums.length > 0) {
      console.log("  First 5 albums:");
      for (const a of albums.slice(0, 5)) console.log(`    ${a.albumId} | ${a.n} photos | ${a.title.slice(0, 70)}`);
    }
    if (variant === "?isSubCate=true" && albums.length > 0) {
      console.log("  First 5 albums (isSubCate):");
      for (const a of albums.slice(0, 5)) console.log(`    ${a.albumId} | ${a.n} photos | ${a.title.slice(0, 70)}`);
    }
    if (subcats.length > 0 && variant === "") {
      // Filter to those containing our parent id is hard; just show ones that look like nested teams
      const nested = subcats.filter((s) => s.id !== String(id) && /[a-zA-Z]/.test(s.name));
      console.log(`  Sub-cats (${nested.length}): showing first 30`);
      for (const s of nested.slice(0, 30)) console.log(`    ${s.id} | ${s.name.slice(0, 60)}`);
    }
  }
}

await probe("NBA", "3545572");
await probe("National Team", "3536632");
