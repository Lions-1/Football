/**
 * Probe a few specific NBA team categories on xingkong-sports to:
 *   1) See album titles (Chinese? English? mixed?)
 *   2) Confirm pagination
 *   3) Confirm photo URL format (so the /api/img proxy works)
 *   4) Check if photo.yupoo.com images are reachable through the existing
 *      proxy (which has Referer hardcoded to wanfing).
 */
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

const ALBUM_RX =
  /<a\s+class="album__main"\s+title="([^"]+)"\s+href="\/albums\/(\d+)\?[^"]+"[\s\S]{0,500}?data-src="(https:\/\/photo\.yupoo\.com\/[a-z0-9-]+\/[a-z0-9]+\/(?:small|medium|big)\.(?:jpg|jpeg|png|webp))"[\s\S]{0,500}?<div class="text_overflow album__photonumber">(\d+)<\/div>/g;

async function fetchHtml(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) {
    console.log(`  HTTP ${r.status} -> ${url}`);
    return null;
  }
  return await r.text();
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

const PROBE_CATEGORIES = [
  ["3359577", "Lakers"],
  ["4929343", "NBA 2025-26 Season"],
  ["3398324", "Warriors"],
];

for (const [id, label] of PROBE_CATEGORIES) {
  console.log(`\n=== ${label} (id=${id}) ===`);
  for (let page = 1; page <= 3; page++) {
    const html = await fetchHtml(`https://xingkong-sports.x.yupoo.com/categories/${id}?page=${page}`);
    if (!html) break;
    const albums = extractAlbums(html);
    console.log(`  page ${page}: ${albums.length} albums`);
    if (page === 1) {
      for (const a of albums.slice(0, 8)) {
        console.log(`    ${a.albumId.padEnd(11)} (${a.n}p) ${a.title.slice(0, 90)}`);
      }
      if (albums.length > 0) {
        console.log(`    sample-cover: ${albums[0].cover}`);
      }
    }
    if (albums.length === 0) break;
  }
}

// Test the proxy with a xingkong photo URL
console.log("\n=== Proxy test ===");
// Need a real xingkong photo URL — fetch any
const html = await fetchHtml("https://xingkong-sports.x.yupoo.com/categories/3359577");
const photo = (html || "").match(
  /https:\/\/photo\.yupoo\.com\/(xingkong-sports\/[a-z0-9]+\/[a-z0-9]+\.(?:jpg|jpeg|png|webp))/i,
);
if (!photo) {
  console.log("  No xingkong photo URL found");
} else {
  const path = photo[1];
  console.log(`  Test path: ${path}`);
  // Try direct from photo.yupoo.com (bypassing our proxy) with xingkong referer
  const directRes = await fetch(`https://photo.yupoo.com/${path}`, {
    headers: { Referer: "https://xingkong-sports.x.yupoo.com/" },
  });
  console.log(`  direct (xingkong referer): HTTP ${directRes.status}`);
  // Try with wanfing referer (what our proxy currently sends)
  const wanfingRes = await fetch(`https://photo.yupoo.com/${path}`, {
    headers: { Referer: "https://wanfing.x.yupoo.com/" },
  });
  console.log(`  direct (wanfing referer): HTTP ${wanfingRes.status}`);
  // Try with no referer
  const noRefRes = await fetch(`https://photo.yupoo.com/${path}`);
  console.log(`  direct (no referer):      HTTP ${noRefRes.status}`);
  // Try via local proxy (running dev server)
  try {
    const proxyRes = await fetch(`http://localhost:3000/api/img/${path}`);
    console.log(`  via /api/img proxy:      HTTP ${proxyRes.status}`);
  } catch (e) {
    console.log(`  proxy error: ${e.message}`);
  }
}
