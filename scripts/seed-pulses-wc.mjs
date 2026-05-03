/**
 * Scrape + seed World Cup 2026 national-team products from pulsesfootball.com.
 *
 * Strategy: hit the big catch-all collections first (world-cup-2026, national-teams)
 * then fall back to per-country collections for anything still empty.
 * Detects team from product handle, dedupes per team+variant, caps at ~5/team.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// DB slug -> array of handle aliases to match (longest first inside main list)
const COUNTRY_ALIASES = {
  "argentina": ["argentina"],
  "australia": ["australia"],
  "belgium": ["belgium"],
  "brazil": ["brazil", "brasil"],
  "cameroon": ["cameroon"],
  "canada": ["canada"],
  "colombia": ["colombia"],
  "croatia": ["croatia"],
  "denmark": ["denmark"],
  "ecuador": ["ecuador"],
  "egypt": ["egypt"],
  "england": ["england"],
  "france": ["france"],
  "germany": ["germany"],
  "ghana": ["ghana"],
  "italy": ["italy"],
  "japan": ["japan"],
  "mexico": ["mexico"],
  "morocco": ["morocco"],
  "netherlands": ["netherlands"],
  "nigeria": ["nigeria"],
  "poland": ["poland"],
  "portugal": ["portugal"],
  "saudi-arabia": ["saudi-arabia"],
  "scotland": ["scotland"],
  "senegal": ["senegal"],
  "serbia": ["serbia"],
  "south-korea": ["south-korea", "korea"],
  "spain": ["spain"],
  "switzerland": ["switzerland"],
  "turkey": ["turkey"],
  "tunisia": ["tunisia"],
  "usa": ["usa", "united-states"],
  "uruguay": ["uruguay"],
  "wales": ["wales"],
  "algeria": ["algeria"],
};

const ALL_DB_SLUGS = Object.keys(COUNTRY_ALIASES);

// Collections to hit in order (broadest first, then per-country fallbacks)
const BROAD_COLLECTIONS = ["world-cup-2026", "national-teams"];

function detectTeam(handle) {
  const h = handle.toLowerCase();
  // Try exact DB slugs first (longest)
  const entries = Object.entries(COUNTRY_ALIASES).flatMap(([slug, aliases]) => aliases.map((a) => [slug, a]));
  entries.sort((a, b) => b[1].length - a[1].length);
  for (const [slug, alias] of entries) {
    // Require word boundary to avoid "span" matching inside nothing, etc.
    const re = new RegExp(`(^|[^a-z])${alias}([^a-z]|$)`, "i");
    if (re.test(h)) return slug;
  }
  return null;
}

function detectVariant(handle) {
  const h = handle.toLowerCase();
  let v = "home";
  if (h.includes("away")) v = "away";
  else if (h.includes("third")) v = "third";
  else if (h.includes("gk") || h.includes("goalkeeper")) v = "gk";
  if (h.includes("kids")) v = `kids-${v}`;
  else if (h.includes("women")) v = `women-${v}`;
  if (h.includes("long-sleeve")) v += "-ls";
  if (h.includes("player-version") || h.includes("slim-fit") || h.includes("authentic-player")) v += "-player";
  return v;
}

function pickImages(images) {
  const good = images.filter((img) => {
    const src = img.src.toLowerCase();
    if (src.includes("banner") || src.includes("descricao")) return false;
    return img.width >= 500 && img.height >= 500;
  });
  const arr = good.length ? good : images;
  return arr.slice(0, 3).map((i) => i.src);
}

function cleanTitle(title) {
  return title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/\?\?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function fetchCollection(handle, pages = 5) {
  let all = [];
  for (let page = 1; page <= pages; page++) {
    const url = `https://pulsesfootball.com/collections/${handle}/products.json?page=${page}&limit=250`;
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();
      const batch = data.products || [];
      if (batch.length === 0) break;
      all = all.concat(batch);
    } catch {
      break;
    }
  }
  return all;
}

async function main() {
  console.log("Scraping pulsesfootball WC 2026 catalog...\n");

  // Pool all products from broad collections first
  const pool = new Map(); // handle -> product (dedupes across collections)
  for (const c of BROAD_COLLECTIONS) {
    const products = await fetchCollection(c);
    console.log(`  /collections/${c}: ${products.length}`);
    for (const p of products) {
      if (!pool.has(p.handle)) pool.set(p.handle, p);
    }
  }

  // Now also hit any per-country collection that might have extras
  for (const slug of ALL_DB_SLUGS) {
    const products = await fetchCollection(slug);
    if (products.length > 0) {
      let added = 0;
      for (const p of products) {
        if (!pool.has(p.handle)) {
          pool.set(p.handle, p);
          added++;
        }
      }
      if (added > 0) console.log(`  /collections/${slug}: +${added}`);
    }
  }

  console.log(`\nTotal unique products in pool: ${pool.size}`);

  // Bucket by team+variant, cap at 5 per team
  const MAX_PER_TEAM = 5;
  const bucketByTeamVariant = new Map(); // team::variant -> row
  const perTeamCount = new Map();

  for (const p of pool.values()) {
    const team = detectTeam(p.handle);
    if (!team) continue;

    const variant = detectVariant(p.handle);
    const key = `${team}::${variant}`;
    if (bucketByTeamVariant.has(key)) continue;

    if ((perTeamCount.get(team) || 0) >= MAX_PER_TEAM) continue;

    const imgs = pickImages(p.images || []);
    if (imgs.length === 0) continue;

    bucketByTeamVariant.set(key, {
      team,
      variant,
      handle: p.handle,
      title: p.title,
      price: p.variants?.[0]?.price,
      imgs,
      sizes: p.options?.find((o) => o.name === "Size")?.values,
    });
    perTeamCount.set(team, (perTeamCount.get(team) || 0) + 1);
  }

  console.log(`Bucketed ${bucketByTeamVariant.size} products across ${perTeamCount.size} teams.\n`);

  // Seed into DB
  const dbTeams = await prisma.team.findMany({
    where: { league: { slug: "national-teams" } },
    select: { id: true, slug: true, name: true },
  });
  const slugToId = Object.fromEntries(dbTeams.map((t) => [t.slug, t.id]));

  let created = 0, skipped = 0;
  for (const row of bucketByTeamVariant.values()) {
    const teamId = slugToId[row.team];
    if (!teamId) {
      skipped++;
      continue;
    }
    const slug = slugify(`${row.team}-${row.variant}-${row.handle}`);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.product.create({
      data: {
        name: cleanTitle(row.title),
        slug,
        price: parseFloat(row.price || "189"),
        images: JSON.stringify(row.imgs),
        sizes: JSON.stringify(row.sizes && row.sizes.length ? row.sizes : ["S", "M", "L", "XL", "XXL"]),
        teamId,
        category: "jersey",
        season: "26/27",
        surCommande: false,
        inStock: true,
      },
    });
    created++;
  }

  console.log(`Created: ${created}, skipped: ${skipped}\n`);

  const counts = await prisma.team.findMany({
    where: { league: { slug: "national-teams" } },
    select: { name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  console.log("Final WC team coverage:");
  let still0 = 0;
  for (const t of counts) {
    console.log(`  ${t.name.padEnd(22)} ${t._count.products}`);
    if (t._count.products === 0) still0++;
  }
  console.log(`\n${counts.length - still0}/${counts.length} teams have products (${still0} still empty).`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
