/**
 * Download the 10 missing NBA team logos from ESPN's CDN.
 * ESPN pattern: https://a.espncdn.com/i/teamlogos/nba/500/<espn_id>.png
 */
import fs from "fs";
import path from "path";

const DIR = "public/logos/nba";

// ESPN team IDs for the 10 missing teams
const MISSING = [
  { slug: "charlotte-hornets",       espnId: 30 },
  { slug: "detroit-pistons",         espnId: 8  },
  { slug: "indiana-pacers",          espnId: 11 },
  { slug: "minnesota-timberwolves",  espnId: 16 },
  { slug: "new-orleans-pelicans",    espnId: 3  },
  { slug: "orlando-magic",           espnId: 19 },
  { slug: "portland-trail-blazers",  espnId: 22 },
  { slug: "sacramento-kings",        espnId: 23 },
  { slug: "utah-jazz",              espnId: 26 },
  { slug: "washington-wizards",      espnId: 27 },
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "image/png,image/*,*/*;q=0.8",
};

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

let ok = 0;
for (const { slug, espnId } of MISSING) {
  const outPath = path.join(DIR, `${slug}.png`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) {
    console.log(`  skip (exists): ${slug}`);
    ok++;
    continue;
  }

  const url = `https://a.espncdn.com/i/teamlogos/nba/500/${espnId}.png`;
  try {
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) {
      console.log(`  FAIL HTTP ${r.status}: ${slug} (${url})`);
      continue;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) {
      console.log(`  FAIL too small (${buf.length}b): ${slug}`);
      continue;
    }
    fs.writeFileSync(outPath, buf);
    console.log(`  OK ${buf.length}b: ${slug}`);
    ok++;
  } catch (e) {
    console.log(`  ERROR: ${slug} — ${e.message}`);
  }
}

console.log(`\nDone: ${ok}/${MISSING.length} logos saved.`);
