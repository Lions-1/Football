/**
 * Targeted probe — full HTML structure of one album + sub-category list page.
 */
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Referer": "https://wanfing.x.yupoo.com/",
};

async function fetchHtml(url) {
  const r = await fetch(url, { headers: HEADERS });
  return await r.text();
}

// 1) Album page — find the photo container and extract every image attribute
console.log("=== ALBUM /albums/226353296 (NBA Jersey Sizes) ===");
const album1 = await fetchHtml("https://wanfing.x.yupoo.com/albums/226353296?uid=1");
console.log("len:", album1.length);

// Look for photo grid markup pattern
const photoIdx = album1.indexOf("class=\"showalbum__children");
if (photoIdx > 0) {
  console.log("Found photo container at idx:", photoIdx);
  console.log(album1.slice(photoIdx, photoIdx + 4000));
}

// Other useful markup
const idx2 = album1.indexOf("photo.yupoo.com/wanfing");
if (idx2 > 0) {
  console.log("\n--- around first photo ref ---");
  console.log(album1.slice(Math.max(0, idx2 - 600), idx2 + 600));
}

// 2) Sub-category page (Real Madrid) - look for album cards markup
console.log("\n\n=== SUB-CATEGORY /categories/815924 (Real Madrid) ===");
const cat1 = await fetchHtml("https://wanfing.x.yupoo.com/categories/815924?isSubCate=true");
console.log("len:", cat1.length);

// Find the album card pattern
const cardIdx = cat1.indexOf("class=\"album__main");
if (cardIdx > 0) {
  console.log("Found album card at idx:", cardIdx);
  console.log(cat1.slice(cardIdx, cardIdx + 2000));
} else {
  console.log("(no album__main class found)");
  // Try alternative
  const alt = cat1.indexOf("/albums/");
  if (alt > 0) console.log("First /albums/ ref:\n", cat1.slice(Math.max(0, alt - 600), alt + 1200));
}
