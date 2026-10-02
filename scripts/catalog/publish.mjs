/**
 * Stage 3 — publish processed products to the site.
 *
 * Two phases, run in this order:
 *   --phase files : copy the chosen backdrop variant into public/catalog/<slug>/
 *                   as <n>-<hash>.webp (static files served by the CDN — never
 *                   base64, never in the database). Commit + push, wait for deploy.
 *   --phase db    : insert one small Product row per item pointing at those files.
 *
 * Dry-run by default; add --apply to actually write.
 *
 *   node scripts/catalog/publish.mjs --variant studio --phase files --apply
 *   node scripts/catalog/publish.mjs --variant studio --phase db --apply
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const APPLY = args.includes("--apply");
const VARIANT = arg("--variant", "white");
const PHASE = arg("--phase", "files");
const INCLUDE_FLAGGED = args.includes("--include-flagged");
const PRE_ORDER = args.includes("--pre-order");

const PRICE_MAD = 280;
const SIZES = ["S", "M", "L", "XL", "XXL"];
const SEASON = "2026/27";
const KIT_LABEL = { home: "Home", away: "Away", third: "Third" };
// Kit manufacturer per club (2026/27) — used in the description, which follows
// the owner's existing style: "Nike Nigeria Jayjay Okocha 1996 Retro Jersey Men's".
const BRAND = {
  "real-madrid": "Adidas", "fc-barcelona": "Nike", "atletico-madrid": "Nike",
  "manchester-united": "Adidas", "manchester-city": "Puma", "liverpool": "Adidas",
  "arsenal": "Adidas", "chelsea": "Nike", "tottenham": "Nike",
  "bayern-munich": "Adidas", "borussia-dortmund": "Puma", "juventus": "Adidas",
  "inter-milan": "Nike", "ac-milan": "Puma", "napoli": "EA7", "as-roma": "Adidas",
  "paris-saint-germain": "Nike", "olympique-marseille": "Puma",
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORK = path.join(ROOT, "scripts", "catalog", "work");
const PUBLIC_DIR = path.join(ROOT, "public", "catalog");

const results = JSON.parse(fs.readFileSync(path.join(WORK, "results.json"), "utf8"))
  .filter((r) => INCLUDE_FLAGGED || !r.flag)
  .filter((r) => (r.files[VARIANT] || []).length > 0);

/** Stable public URLs for one product: /catalog/<slug>/<n>-<hash8>.webp */
function plannedFiles(r) {
  return r.files[VARIANT].map((src, i) => {
    const buf = fs.readFileSync(path.resolve(path.join(ROOT, "scripts", "catalog"), src));
    const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
    const name = `${i + 1}-${hash}.webp`;
    return { src: path.resolve(path.join(ROOT, "scripts", "catalog"), src), buf, url: `/catalog/${r.slug}/${name}`, dest: path.join(PUBLIC_DIR, r.slug, name) };
  });
}

async function phaseFiles() {
  let n = 0, bytes = 0;
  for (const r of results) {
    const dir = path.join(PUBLIC_DIR, r.slug);
    // Re-publishing replaces the product's images (names are content-hashed,
    // so stale files would otherwise linger next to the new ones).
    if (APPLY) fs.rmSync(dir, { recursive: true, force: true });
    for (const f of plannedFiles(r)) {
      bytes += f.buf.length; n++;
      if (APPLY) {
        fs.mkdirSync(path.dirname(f.dest), { recursive: true });
        fs.writeFileSync(f.dest, f.buf);
      }
    }
  }
  console.log(`${APPLY ? "Wrote" : "Would write"} ${n} images (${(bytes / 1024 / 1024).toFixed(1)} MB) for ${results.length} products -> public/catalog/`);
}

async function phaseDb() {
  const prisma = new PrismaClient();
  const teams = new Map((await prisma.team.findMany({ select: { id: true, slug: true, name: true } })).map((t) => [t.slug, t]));
  let created = 0, skipped = 0;
  for (const r of results) {
    const team = teams.get(r.team);
    if (!team) { console.log(`  ! no DB team for ${r.team}`); skipped++; continue; }
    const files = plannedFiles(r);
    const missing = files.filter((f) => !fs.existsSync(f.dest));
    if (missing.length) { console.log(`  ! ${r.slug}: run --phase files first`); skipped++; continue; }
    const urls = JSON.stringify(files.map((f) => f.url));
    const existing = await prisma.product.findUnique({ where: { slug: r.slug }, select: { id: true, images: true } });
    if (existing) {
      // already published: only refresh its image paths (files were re-published)
      if (existing.images !== urls) {
        console.log(`  ~ ${r.slug} exists — image paths refreshed`);
        if (APPLY) await prisma.product.update({ where: { id: existing.id }, data: { images: urls } });
      } else {
        console.log(`  = ${r.slug} exists, unchanged`);
      }
      skipped++;
      continue;
    }
    const kit = KIT_LABEL[r.kit];
    const data = {
      name: `${team.name} 26-27 ${kit} Player Version`,
      description: [BRAND[r.team], team.name, SEASON, kit, "Jersey Player Version Men's"].filter(Boolean).join(" "),
      slug: r.slug,
      price: PRICE_MAD,
      images: urls,
      sizes: JSON.stringify(SIZES),
      teamId: team.id,
      category: "jersey",
      season: SEASON,
      surCommande: PRE_ORDER,
    };
    console.log(`  + ${data.name.padEnd(38)} ${files.length} imgs  ${PRICE_MAD} MAD`);
    if (APPLY) await prisma.product.create({ data });
    created++;
  }
  console.log(`${APPLY ? "Created" : "Would create"} ${created} products, skipped ${skipped}.`);
  await prisma.$disconnect();
}

if (!APPLY) console.log("DRY RUN — add --apply to write.\n");
await (PHASE === "db" ? phaseDb() : phaseFiles());
