/**
 * Download a proper UEFA Champions League logo from a reliable CDN.
 * Tries several sources until one works.
 */
import fs from "fs";
import path from "path";

const TARGET = "public/logos/leagues/champions-league.png";

const SOURCES = [
  // FotMob's CDN — used by fotmob.com, very reliable
  "https://images.fotmob.com/image_resources/logo/leaguelogo/42.png",
  // SofaScore
  "https://api.sofascore.app/api/v1/unique-tournament/7/image/dark",
  // Sportmonks placeholder
  "https://cdn.sportmonks.com/images/soccer/leagues/2.png",
  // Wikipedia raw (no thumbnail proxy)
  "https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League.svg",
  // 1000Logos mirror
  "https://1000logos.net/wp-content/uploads/2017/05/UEFA-Champions-League-logo.png",
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "image/png,image/svg+xml,image/*,*/*;q=0.8",
};

for (const url of SOURCES) {
  try {
    console.log(`Trying: ${url}`);
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) {
      console.log(`  HTTP ${r.status}`);
      continue;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2000) {
      console.log(`  Too small (${buf.length} bytes), skipping`);
      continue;
    }
    // Validate magic bytes
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isSvg = buf.subarray(0, 100).toString("utf8").includes("<svg");
    if (!isPng && !isSvg) {
      console.log(`  Not a PNG or SVG (got ${buf.subarray(0, 8).toString("hex")})`);
      continue;
    }
    // Decide extension
    const out = isSvg
      ? TARGET.replace(/\.png$/, ".svg")
      : TARGET;
    fs.writeFileSync(out, buf);
    console.log(`  ✔ Saved ${buf.length} bytes -> ${out}`);
    // If we wrote SVG, also remove the bad PNG so the lookup table can be updated
    if (isSvg && fs.existsSync(TARGET)) fs.unlinkSync(TARGET);
    process.exit(0);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
}

console.log("\nAll sources failed.");
process.exit(1);
