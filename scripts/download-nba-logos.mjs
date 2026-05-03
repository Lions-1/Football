/**
 * Download all 20 NBA team logos locally from ESPN's CDN.
 * Saves to /public/logos/nba/{slug}.png
 */
import fs from "fs";
import path from "path";

// Map DB team slug -> ESPN abbreviation
const NBA = [
  ["atlanta-hawks", "atl"],
  ["boston-celtics", "bos"],
  ["brooklyn-nets", "bkn"],
  ["chicago-bulls", "chi"],
  ["cleveland-cavaliers", "cle"],
  ["dallas-mavericks", "dal"],
  ["denver-nuggets", "den"],
  ["golden-state-warriors", "gs"],
  ["houston-rockets", "hou"],
  ["los-angeles-clippers", "lac"],
  ["los-angeles-lakers", "lal"],
  ["memphis-grizzlies", "mem"],
  ["miami-heat", "mia"],
  ["milwaukee-bucks", "mil"],
  ["new-york-knicks", "ny"],
  ["oklahoma-city-thunder", "okc"],
  ["philadelphia-76ers", "phi"],
  ["phoenix-suns", "phx"],
  ["san-antonio-spurs", "sa"],
  ["toronto-raptors", "tor"],
];

const dest = "public/logos/nba";
fs.mkdirSync(dest, { recursive: true });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0, fail = 0;
for (const [slug, abbr] of NBA) {
  const url = `https://a.espncdn.com/i/teamlogos/nba/500/${abbr}.png`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.8" },
    });
    if (!res.ok) {
      console.log(`FAIL ${slug}: ${res.status}`);
      fail++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const out = path.join(dest, `${slug}.png`);
    fs.writeFileSync(out, buf);
    console.log(`  ${slug} (${buf.length} bytes)`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${slug}: ${e.message}`);
    fail++;
  }
  await sleep(150);
}
console.log(`\nDone: ${ok} saved, ${fail} failed`);
