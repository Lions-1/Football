/**
 * Scrape + seed NBA products from pulsesfootball.com's `nba-collection`.
 * Hits /collections/nba-collection/products.json (up to 250/page, multi-page).
 * Detects team from handle, dedupes by team+edition, and upserts into DB.
 *
 * Only seeds teams that already exist in the DB (20 NBA teams).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// NBA team slugs in DB (order matters for handle matching: longest first)
const NBA_TEAMS_RAW = [
  "oklahoma-city-thunder",
  "los-angeles-lakers",
  "los-angeles-clippers",
  "golden-state-warriors",
  "cleveland-cavaliers",
  "san-antonio-spurs",
  "philadelphia-76ers",
  "memphis-grizzlies",
  "new-york-knicks",
  "toronto-raptors",
  "brooklyn-nets",
  "dallas-mavericks",
  "milwaukee-bucks",
  "atlanta-hawks",
  "boston-celtics",
  "chicago-bulls",
  "denver-nuggets",
  "houston-rockets",
  "phoenix-suns",
  "miami-heat",
];

function detectTeam(handle) {
  // Longest slug first so "los-angeles-lakers" matches before generic "lakers"
  const sorted = [...NBA_TEAMS_RAW].sort((a, b) => b.length - a.length);
  for (const slug of sorted) {
    if (handle.includes(slug)) return slug;
  }
  return null;
}

function detectEdition(handle) {
  const h = handle.toLowerCase();
  if (h.includes("city-edition")) return "city";
  if (h.includes("association-edition") || h.includes("association")) return "association";
  if (h.includes("icon-edition") || h.includes("icon")) return "icon";
  if (h.includes("statement-edition") || h.includes("statement")) return "statement";
  return "classic";
}

function pickImages(images) {
  return images
    .filter((img) => {
      const src = img.src.toLowerCase();
      if (src.includes("banner") || src.includes("descricao")) return false;
      return img.width >= 500 && img.height >= 500;
    })
    .slice(0, 3)
    .map((i) => i.src);
}

function cleanTitle(title) {
  return title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/\?\?/g, "") // kill the encoding glitch (Don??i?? -> Doncic)
    .replace(/\bDon\s*i\b/gi, "Doncic")
    .replace(/\bGianni\s*i\b/gi, "Giannis")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function fetchPage(page) {
  const url = `https://pulsesfootball.com/collections/nba-collection/products.json?page=${page}&limit=250`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.products || [];
}

async function main() {
  console.log("Scraping pulsesfootball NBA collection...\n");

  let all = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await fetchPage(page);
    if (batch.length === 0) break;
    all = all.concat(batch);
    console.log(`  page ${page}: +${batch.length} (total ${all.length})`);
  }

  // Dedupe: keep max 4 per team, prefer distinct editions, prefer images >= 2
  const byTeamEdition = new Map();
  for (const p of all) {
    const team = detectTeam(p.handle);
    if (!team) continue;
    const edition = detectEdition(p.handle);
    const imgs = pickImages(p.images || []);
    if (imgs.length === 0) continue;

    const key = `${team}::${edition}`;
    const prev = byTeamEdition.get(key);
    // Prefer the one with more images
    if (!prev || imgs.length > prev.imgs.length) {
      byTeamEdition.set(key, { team, edition, handle: p.handle, title: p.title, price: p.variants?.[0]?.price, imgs, sizes: p.options?.find((o) => o.name === "Size")?.values });
    }
  }

  console.log(`\nUnique team/edition combos: ${byTeamEdition.size}`);

  // Map to DB team IDs
  const dbTeams = await prisma.team.findMany({
    where: { league: { slug: "nba" } },
    select: { id: true, slug: true },
  });
  const slugToId = Object.fromEntries(dbTeams.map((t) => [t.slug, t.id]));

  let created = 0, skipped = 0;
  for (const row of byTeamEdition.values()) {
    const teamId = slugToId[row.team];
    if (!teamId) {
      console.log(`  SKIP (no DB team): ${row.team}`);
      skipped++;
      continue;
    }

    const cleanedTitle = cleanTitle(row.title);
    const slug = slugify(`${row.team}-${row.edition}-${row.handle}`);

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        name: cleanedTitle,
        slug,
        price: parseFloat(row.price || "249"),
        images: JSON.stringify(row.imgs),
        sizes: JSON.stringify(row.sizes && row.sizes.length ? row.sizes : ["S", "M", "L", "XL", "XXL"]),
        teamId,
        category: "jersey",
        season: row.edition === "classic" ? null : `${row.edition} edition`,
        surCommande: false,
        inStock: true,
      },
    });
    created++;
    console.log(`  + ${row.team} (${row.edition}) ${row.imgs.length} imgs`);
  }

  console.log(`\nDone: created=${created}, skipped=${skipped}`);

  // Verify per-team counts
  const counts = await prisma.team.findMany({
    where: { league: { slug: "nba" } },
    select: { name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  console.log("\nFinal NBA team coverage:");
  for (const t of counts) console.log(`  ${t.name.padEnd(30)} ${t._count.products}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
