/**
 * Final cleanup:
 *  1. Directly fetch known-working pulsesfootball handles for stubborn countries
 *     (Canada — search suggest was noisy)
 *  2. Delete any remaining crest-only placeholder products for countries
 *     with no pulsesfootball presence (Tunisia, Turkey, Ecuador)
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const BASE = "https://pulsesfootball.com";

const DIRECT_HANDLES = {
  "canada": [
    "canada-24-25-i-home-jersey-fan-version",
    "canada-24-25-ii-away-jersey-fan-version",
    "canada-21-22-i-home-jersey-fan-version",
  ],
  "morocco": [
    "morocco-25-26-i-home-jersey-player-version",
    "morocco-25-26-ii-away-jersey-player-version",
    "morocco-22-23-i-home-jersey-fan-version",
    "morocco-1998-i-home-jersey-retro-version",
  ],
};

const COUNTRIES_TO_CLEAN = ["tunisia", "turkey", "ecuador"];

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function isReal(url) {
  return typeof url === "string" && (url.includes("cdn.shopify.com") || url.includes("pulsesfootball"));
}

async function fetchProductDetail(handle) {
  try {
    const r = await fetch(`${BASE}/products/${handle}.json`);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.product || null;
  } catch {
    return null;
  }
}

function filterUsableImages(urls) {
  return urls
    .filter(u => typeof u === "string")
    .filter(u => !u.toLowerCase().includes("banner"))
    .filter(u => !u.toLowerCase().includes("descricao"))
    .filter(u => !u.toLowerCase().includes("small_"))
    .slice(0, 3);
}

async function main() {
  // 1. Canada via direct handles
  for (const [countrySlug, handles] of Object.entries(DIRECT_HANDLES)) {
    const team = await prisma.team.findUnique({ where: { slug: countrySlug } });
    if (!team) continue;

    // Delete placeholder crest products
    const existing = await prisma.product.findMany({ where: { teamId: team.id } });
    for (const ep of existing) {
      const imgs = JSON.parse(ep.images || "[]");
      if (!imgs.some(isReal)) await prisma.product.delete({ where: { id: ep.id } });
    }

    for (const handle of handles) {
      const detail = await fetchProductDetail(handle);
      if (!detail) { console.log(`  ${countrySlug}: fetch failed ${handle}`); continue; }
      const images = filterUsableImages((detail.images || []).map(i => i.src));
      if (images.length === 0) continue;

      const title = (detail.title || "").replace(/\s+/g, " ").trim();
      const slug = slugify(`${countrySlug}-${handle}`);
      const existingP = await prisma.product.findUnique({ where: { slug } });
      if (existingP) {
        await prisma.product.update({
          where: { id: existingP.id },
          data: { images: JSON.stringify(images), name: title },
        });
      } else {
        await prisma.product.create({
          data: {
            name: title,
            slug,
            price: 199,
            images: JSON.stringify(images),
            sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
            teamId: team.id,
            category: "jersey",
            season: "2025/26",
            surCommande: true,
            featured: handle.includes("home"),
          },
        });
      }
      console.log(`  ✓ ${countrySlug}: ${title}`);
    }
  }

  // 2. Delete crest-only placeholders for countries with no real jersey source
  for (const slug of COUNTRIES_TO_CLEAN) {
    const team = await prisma.team.findUnique({ where: { slug }, include: { products: true } });
    if (!team) continue;
    let deleted = 0;
    for (const p of team.products) {
      const imgs = JSON.parse(p.images || "[]");
      if (!imgs.some(isReal)) {
        await prisma.product.delete({ where: { id: p.id } });
        deleted++;
      }
    }
    console.log(`  ${slug}: deleted ${deleted} crest-only products`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
