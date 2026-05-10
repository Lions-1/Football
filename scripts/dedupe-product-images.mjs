/**
 * Dedupe product images.
 *
 * Yupoo scrapers (xingkong-sports, wanfing) emitted TWO URLs per photo:
 *   /api/img/<src>/<photo-hash>/big.jpg     (high-res "big" version)
 *   /api/img/<src>/<photo-hash>/<file>.jpg  (original-name version)
 *
 * Both point to the SAME photo, just different files in the same Yupoo
 * "photo folder". This script keeps ONE URL per photo hash (preferring
 * `big.jpg` for consistent sizing) while preserving the upload order so
 * the first photo — which Yupoo conventions say is the seller's chosen
 * cover/front shot — stays at index 0.
 *
 * For non-Yupoo URLs (Shopify F1, etc.) it does plain de-dup by URL.
 *
 * Pass --dry to preview changes without writing.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DRY = process.argv.includes("--dry");

/** Yupoo photo hash from `/api/img/<src>/<hash>/<file>` paths. */
function yupooHash(url) {
  const m = url.match(/\/api\/img\/[^/]+\/([^/]+)\//);
  return m ? m[1] : null;
}

function dedupeImages(imgs) {
  const seenHash = new Set();          // for Yupoo
  const seenUrl  = new Set();          // for everything else
  const kept = [];

  // First pass: collect URLs per Yupoo hash so we can prefer big.jpg.
  const byHash = new Map();
  for (const url of imgs) {
    const h = yupooHash(url);
    if (h) {
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push(url);
    }
  }

  for (const url of imgs) {
    const h = yupooHash(url);
    if (h) {
      if (seenHash.has(h)) continue;
      seenHash.add(h);
      // Prefer the big.jpg variant for that photo if available.
      const variants = byHash.get(h);
      const big = variants.find(u => /\/big\.jpg$/i.test(u));
      kept.push(big || variants[0]);
    } else {
      if (seenUrl.has(url)) continue;
      seenUrl.add(url);
      kept.push(url);
    }
  }
  return kept;
}

async function withRetry(fn, label, attempts = 5) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      const wait = 1500 * i;
      console.warn(`  [retry ${i}/${attempts}] ${label}: ${err.code || err.message}. waiting ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
      try { await prisma.$disconnect(); } catch {}
      try { await prisma.$connect(); } catch {}
    }
  }
  throw lastErr;
}

const all = await withRetry(
  () => prisma.product.findMany({ select: { id: true, name: true, images: true } }),
  "findMany products"
);

let changed = 0;
let removedTotal = 0;
let processed = 0;
const samples = [];

for (const p of all) {
  processed++;
  let imgs;
  try { imgs = JSON.parse(p.images); } catch { continue; }
  if (!Array.isArray(imgs) || imgs.length < 2) continue;

  const cleaned = dedupeImages(imgs);
  if (cleaned.length !== imgs.length) {
    changed++;
    removedTotal += imgs.length - cleaned.length;
    if (samples.length < 5) {
      samples.push({ name: p.name, before: imgs.length, after: cleaned.length });
    }
    if (!DRY) {
      await withRetry(
        () => prisma.product.update({
          where: { id: p.id },
          data: { images: JSON.stringify(cleaned) },
        }),
        `update ${p.id}`
      );
    }
  }
  if (processed % 100 === 0) console.log(`  ... ${processed}/${all.length} (changed=${changed})`);
}

console.log(`${DRY ? "[DRY RUN] " : ""}Products scanned: ${all.length}`);
console.log(`Products updated: ${changed}`);
console.log(`Duplicate URLs removed: ${removedTotal}`);
console.log(`\nSample changes:`);
for (const s of samples) {
  console.log(`  ${s.name.padEnd(50).slice(0, 50)} ${s.before} -> ${s.after}`);
}

await prisma.$disconnect();
