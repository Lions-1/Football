/**
 * Fill in the 7 countries that the main WC scraper missed (no dedicated collection).
 * Strategy: hit the store-wide /products.json feed (paginated) + Shopify search.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGETS = {
  "algeria": ["algeria", "algerie"],
  "ecuador": ["ecuador"],
  "nigeria": ["nigeria"],
  "scotland": ["scotland"],
  "serbia": ["serbia", "srbija"],
  "tunisia": ["tunisia", "tunisie"],
  "turkey": ["turkey", "turkiye", "türkiye"],
};

function detectTargetTeam(handle, title) {
  const h = (handle + " " + (title || "")).toLowerCase();
  for (const [slug, aliases] of Object.entries(TARGETS)) {
    for (const a of aliases) {
      const re = new RegExp(`(^|[^a-z])${a}([^a-z]|$)`, "i");
      if (re.test(h)) return slug;
    }
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
  if (h.includes("long-sleeve")) v += "-ls";
  if (h.includes("player-version") || h.includes("slim-fit")) v += "-player";
  return v;
}

function pickImages(images) {
  const good = (images || []).filter((img) => {
    const src = (img.src || "").toLowerCase();
    if (src.includes("banner") || src.includes("descricao")) return false;
    return (img.width || 0) >= 500 && (img.height || 0) >= 500;
  });
  const arr = good.length ? good : images || [];
  return arr.slice(0, 3).map((i) => i.src);
}

function cleanTitle(t) {
  return (t || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/\?\?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function fetchAllProducts(pages = 15) {
  let all = [];
  for (let page = 1; page <= pages; page++) {
    const url = `https://pulsesfootball.com/products.json?page=${page}&limit=250`;
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();
      const batch = data.products || [];
      if (batch.length === 0) break;
      all = all.concat(batch);
      process.stdout.write(`  page ${page}: +${batch.length} (total ${all.length})\n`);
    } catch (e) {
      console.log(`  page ${page} err:`, e.message);
      break;
    }
  }
  return all;
}

async function main() {
  console.log("Fetching all pulsesfootball products to find stragglers...\n");
  const all = await fetchAllProducts(20);
  console.log(`\nScanning ${all.length} products for ${Object.keys(TARGETS).join(", ")}...\n`);

  // Group matches per team, cap 5
  const buckets = new Map();
  const count = new Map();
  const MAX = 5;
  for (const p of all) {
    const team = detectTargetTeam(p.handle, p.title);
    if (!team) continue;
    if ((count.get(team) || 0) >= MAX) continue;
    const variant = detectVariant(p.handle);
    const key = `${team}::${variant}`;
    if (buckets.has(key)) continue;
    const imgs = pickImages(p.images);
    if (imgs.length === 0) continue;
    buckets.set(key, {
      team,
      variant,
      handle: p.handle,
      title: p.title,
      price: p.variants?.[0]?.price,
      imgs,
      sizes: p.options?.find((o) => o.name === "Size")?.values,
    });
    count.set(team, (count.get(team) || 0) + 1);
  }

  console.log(`Found ${buckets.size} candidates across ${count.size} target countries:`);
  for (const [team, n] of count) console.log(`  ${team}: ${n}`);

  const dbTeams = await prisma.team.findMany({
    where: { slug: { in: Object.keys(TARGETS) } },
    select: { id: true, slug: true },
  });
  const slugToId = Object.fromEntries(dbTeams.map((t) => [t.slug, t.id]));

  let created = 0, skipped = 0;
  for (const row of buckets.values()) {
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
    console.log(`  + ${row.team} (${row.variant})`);
  }

  console.log(`\nCreated: ${created}, skipped: ${skipped}`);

  const stillEmpty = await prisma.team.findMany({
    where: { slug: { in: Object.keys(TARGETS) }, products: { none: {} } },
    select: { slug: true },
  });
  console.log(`\nStill empty: ${stillEmpty.map((t) => t.slug).join(", ") || "(none)"}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
