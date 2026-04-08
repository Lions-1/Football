/**
 * Scrapes World Cup 2026 products from pulsesfootball.com via Shopify JSON API.
 * Outputs a JSON file with product data ready to seed into our DB.
 */

const BASE = "https://pulsesfootball.com";

// Map pulsesfootball product handles → our team slugs
const TEAM_MAP = {
  // Country keywords in handle → our slug
  "brazil": "brazil",
  "argentina": "argentina",
  "portugal": "portugal",
  "germany": "germany",
  "japan": "japan",
  "italy": "italy",
  "mexico": "mexico",
  "belgium": "belgium",
  "colombia": "colombia",
  "chile": "chile",
  "saudi-arabia": "saudi-arabia",
  "hungary": "hungary",
  "england": "england",
  "france": "france",
  "spain": "spain",
  "netherlands": "netherlands",
  "croatia": "croatia",
  "morocco": "morocco",
  "senegal": "senegal",
  "usa": "usa",
  "canada": "canada",
  "cameroon": "cameroon",
  "ghana": "ghana",
  "nigeria": "nigeria",
  "south-korea": "south-korea",
  "australia": "australia",
  "uruguay": "uruguay",
  "ecuador": "ecuador",
  "serbia": "serbia",
  "poland": "poland",
  "switzerland": "switzerland",
};

function detectTeam(handle) {
  // Try longest match first
  const sorted = Object.keys(TEAM_MAP).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (handle.includes(key)) return TEAM_MAP[key];
  }
  return null;
}

function pickBestImage(images) {
  // Prefer images showing person wearing jersey (usually larger images, webp/png format)
  // Skip banner images and description images
  const dominated = images.filter(img => {
    const src = img.src.toLowerCase();
    // Skip banner/promotional images
    if (src.includes("banner")) return false;
    if (src.includes("descricao")) return false;
    // Prefer reasonable sized product images
    return img.width >= 500 && img.height >= 500;
  });
  
  // Return top 2 images (main + alternate angle)
  const selected = dominated.length > 0 ? dominated : images;
  return selected.slice(0, 3).map(img => img.src);
}

async function fetchPage(page) {
  const url = `${BASE}/collections/world-cup-2026/products.json?page=${page}&limit=250`;
  console.log(`  Fetching page ${page}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
  const data = await res.json();
  return data.products || [];
}

async function main() {
  console.log("Scraping World Cup 2026 products from pulsesfootball.com...\n");

  // Fetch all pages
  let allProducts = [];
  for (let page = 1; page <= 5; page++) {
    const products = await fetchPage(page);
    if (products.length === 0) break;
    allProducts = allProducts.concat(products);
    console.log(`  Page ${page}: ${products.length} products`);
  }

  console.log(`\nTotal raw products: ${allProducts.length}`);

  // Process and deduplicate by team (keep best per team + variant types)
  const result = [];
  const seenTeamVariants = new Set();

  for (const p of allProducts) {
    const team = detectTeam(p.handle);
    if (!team) {
      console.log(`  SKIP (no team match): ${p.handle}`);
      continue;
    }

    // Detect variant type from handle
    let variant = "home";
    if (p.handle.includes("away")) variant = "away";
    else if (p.handle.includes("third")) variant = "third";
    else if (p.handle.includes("gk") || p.handle.includes("goalkeeper")) variant = "goalkeeper";
    
    // Skip kids, women's, long sleeve, player version duplicates for cleaner catalog
    const h = p.handle.toLowerCase();
    if (h.includes("kids")) variant = "kids-" + variant;
    if (h.includes("women")) variant = "women-" + variant;
    if (h.includes("long-sleeve")) variant = variant + "-ls";
    if (h.includes("player-version") || h.includes("authentic-player") || h.includes("slim-fit")) variant = variant + "-player";

    const key = `${team}::${variant}`;
    if (seenTeamVariants.has(key)) continue;
    seenTeamVariants.add(key);

    const images = pickBestImage(p.images || []);
    if (images.length === 0) {
      console.log(`  SKIP (no images): ${p.handle}`);
      continue;
    }

    // Clean up title - remove emojis and excessive text
    let title = p.title
      .replace(/[\u{1F300}-\u{1FAFF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    result.push({
      team,
      variant,
      title,
      handle: p.handle,
      price: parseFloat(p.variants?.[0]?.price || "199"),
      images,
      sizes: (p.options?.find(o => o.name === "Size")?.values || ["S", "M", "L", "XL", "XXL"]),
    });

    console.log(`  OK: ${team} (${variant}) - ${images.length} images - "${title}"`);
  }

  console.log(`\nProcessed: ${result.length} unique team/variant products`);

  // Write output
  const fs = await import("fs");
  const outPath = new URL("./wc2026-products.json", import.meta.url);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nSaved to ${outPath}`);
}

main().catch(console.error);
