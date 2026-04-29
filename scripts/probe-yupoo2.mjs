/**
 * Deeper probe — extract photo URL patterns from a single album page.
 */
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Referer": "https://wanfing.x.yupoo.com/",
};

async function fetchHtml(url) {
  const r = await fetch(url, { headers: HEADERS });
  return { status: r.status, body: await r.text() };
}

// 1) Album page
console.log("=== ALBUM PAGE ===");
const albumRes = await fetchHtml("https://wanfing.x.yupoo.com/albums/226353296?uid=1");
console.log("status:", albumRes.status, "len:", albumRes.body.length);

// All photo URLs
const photoMatches = [...albumRes.body.matchAll(/https?:\/\/photo\.yupoo\.com\/wanfing\/[a-z0-9]+\/(?:small|medium|large|original)\.(?:jpg|jpeg|png|webp)/gi)];
console.log("\nphoto.yupoo.com/wanfing matches:", photoMatches.length);
console.log("First 8 distinct:", [...new Set(photoMatches.map(m => m[0]))].slice(0, 8));

// data-* attributes for lazy-loaded photos
const dataMatches = [...albumRes.body.matchAll(/data-(?:src|origin-src|original)="([^"]+)"/gi)];
console.log("\ndata-* image attrs:", dataMatches.length);
console.log("First 8 distinct:", [...new Set(dataMatches.map(m => m[1]))].slice(0, 8));

// title
const titleM = albumRes.body.match(/<title[^>]*>([^<]+)<\/title>/i);
console.log("\ntitle:", titleM?.[1]);

// Look for any structured data block listing photos
const ldMatches = [...albumRes.body.matchAll(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/g)];
console.log("\nld+json blocks:", ldMatches.length);
ldMatches.forEach((m, i) => {
  const txt = m[1].slice(0, 500);
  console.log(`--- ld+json #${i} ---`);
  console.log(txt);
});

// 2) Category sub-cat page (list of albums)
console.log("\n\n=== SUB-CATEGORY PAGE (Real Madrid 815924) ===");
const catRes = await fetchHtml("https://wanfing.x.yupoo.com/categories/815924?isSubCate=true");
console.log("status:", catRes.status, "len:", catRes.body.length);
const albumLinks = [...catRes.body.matchAll(/\/albums\/(\d+)[^"']*"[^>]*?(?:title|alt)="([^"]+)"/gi)];
console.log("album links found (with titles):", albumLinks.length);
console.log("First 8:");
[...new Set(albumLinks.map(m => `${m[1]}|${m[2]}`))].slice(0, 8).forEach(s => console.log(" ", s));

// Try simpler match
const simpleAlbumIds = [...new Set([...catRes.body.matchAll(/\/albums\/(\d+)/g)].map(m => m[1]))];
console.log("\nDistinct album IDs found:", simpleAlbumIds.length);
console.log("First 12:", simpleAlbumIds.slice(0, 12));
