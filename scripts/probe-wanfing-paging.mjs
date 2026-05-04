/**
 * Check pagination on the wanfing National Team and NBA categories.
 */
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://wanfing.x.yupoo.com/",
};

const ALBUM_RX =
  /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,500}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;

async function fetchHtml(url) {
  const r = await fetch(url, { headers: HEADERS });
  return r.ok ? await r.text() : null;
}

function countAlbums(html) {
  ALBUM_RX.lastIndex = 0;
  let n = 0;
  while (ALBUM_RX.exec(html)) n++;
  return n;
}

async function probe(label, id) {
  console.log(`\n=== ${label} (id=${id}) ===`);
  for (let page = 1; page <= 8; page++) {
    const url = `https://wanfing.x.yupoo.com/categories/${id}?page=${page}`;
    const html = await fetchHtml(url);
    if (!html) {
      console.log(`  page ${page}: no html`);
      break;
    }
    const n = countAlbums(html);
    console.log(`  page ${page}: ${n} albums`);
    if (n === 0) break;
  }
}

await probe("National Team", "3536632");
await probe("NBA", "3545572");
