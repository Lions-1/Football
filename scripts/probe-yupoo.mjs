/**
 * Probe Yupoo album/category structure to understand HTML markup before
 * building the full scraper.
 */

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://wanfing.x.yupoo.com/",
};

const TEST_URLS = [
  // Top-level category page (NBA)
  "https://wanfing.x.yupoo.com/categories/3545572",
  // Real Madrid sub-category
  "https://wanfing.x.yupoo.com/categories/815924?isSubCate=true",
  // First NBA album (from category page link)
  "https://wanfing.x.yupoo.com/albums/226353296",
  "https://wanfing.x.yupoo.com/albums/226353296?uid=1",
];

for (const url of TEST_URLS) {
  console.log(`\n=== ${url} ===`);
  try {
    const r = await fetch(url, { headers: HEADERS });
    const ct = r.headers.get("content-type") || "";
    console.log(`status=${r.status}  content-type=${ct}  url-final=${r.url}`);
    const body = await r.text();
    console.log(`body length: ${body.length}`);
    // First 1500 chars to see structure
    console.log("--- snippet ---");
    console.log(body.slice(0, 1500));
    console.log("--- middle (around photo.yupoo.com refs) ---");
    const idx = body.indexOf("photo.yupoo.com");
    if (idx > 0) console.log(body.slice(Math.max(0, idx - 200), idx + 800));
    else console.log("(no photo.yupoo.com found)");
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
  }
}
