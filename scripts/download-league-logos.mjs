/**
 * Download league logos locally to /public/logos/leagues/ so we don't depend
 * on Wikipedia (which rate-limits server-side fetches with 429).
 */
import fs from "fs";
import path from "path";

// Each logo can have multiple fallback URLs. We try them in order.
const TARGETS = [
  {
    file: "champions-league.png",
    urls: [
      // football-data.org reliably serves UCL crest as ID 2001
      "https://crests.football-data.org/2001.png",
      "https://logo.clearbit.com/uefa.com",
      "https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg",
    ],
  },
  {
    file: "f1.png",
    urls: [
      "https://logo.clearbit.com/formula1.com",
      "https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg",
    ],
  },
  {
    file: "nba.png",
    urls: [
      "https://logo.clearbit.com/nba.com",
      "https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg",
    ],
  },
];

const dest = "public/logos/leagues";
fs.mkdirSync(dest, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

for (const t of TARGETS) {
  let saved = false;
  for (const url of t.urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) {
        console.log(`  ${url} → ${res.status}`);
        await sleep(800);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      // Detect output extension from URL or content-type
      const ct = res.headers.get("content-type") || "";
      const isSvg = url.endsWith(".svg") || ct.includes("svg");
      const out = path.join(dest, isSvg ? t.file.replace(/\.png$/, ".svg") : t.file);
      fs.writeFileSync(out, buf);
      console.log(`Saved ${out} (${buf.length} bytes)  source=${url}`);
      saved = true;
      break;
    } catch (e) {
      console.log(`  ${url} → ${e.message}`);
    }
  }
  if (!saved) console.log(`FAILED ${t.file} (all sources exhausted)`);
  await sleep(500);
}
