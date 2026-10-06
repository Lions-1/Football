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
const VARIANT = arg("--variant", "grey");
const PHASE = arg("--phase", "files");
const INCLUDE_FLAGGED = args.includes("--include-flagged");
const PRE_ORDER = args.includes("--pre-order");
const KEEP_OLD = args.includes("--keep-old"); // zero-downtime re-publish: keep old files until DB points at the new ones

const PRICE_MAD = 280;
const SIZES = ["S", "M", "L", "XL", "XXL"];
const SEASON = "2026/27";
const KIT_LABEL = { home: "Home", away: "Away", third: "Third", special: "Limited Edition" };
// Kit manufacturer per club (2026/27) — used in the description, which follows
// the owner's existing style: "Nike Nigeria Jayjay Okocha 1996 Retro Jersey Men's".
const BRAND = {
  "real-madrid": "Adidas", "fc-barcelona": "Nike", "atletico-madrid": "Nike",
  "manchester-united": "Adidas", "manchester-city": "Puma", "liverpool": "Adidas",
  "arsenal": "Adidas", "chelsea": "Nike", "tottenham": "Nike",
  "bayern-munich": "Adidas", "borussia-dortmund": "Puma", "juventus": "Adidas",
  "inter-milan": "Nike", "ac-milan": "Puma", "napoli": "EA7", "as-roma": "Adidas",
  "paris-saint-germain": "Nike", "olympique-marseille": "Puma",
  "aston-villa": "Adidas", "ajax": "Adidas", "inter-miami": "Adidas", "crystal-palace": "Macron", "morocco": "Puma",
};
// Teams the owner's stock needs that the seed doesn't have: slug -> [name, league slug, league name]
const NEW_TEAMS = {
  "celtic": ["Celtic", "other-clubs", "Other Clubs"],
  "boca-juniors": ["Boca Juniors", "other-clubs", "Other Clubs"],
  "newells-old-boys": ["Newell's Old Boys", "other-clubs", "Other Clubs"],
  "inter-miami": ["Inter Miami", "other-clubs", "Other Clubs"],
  "palmeiras": ["Palmeiras", "other-clubs", "Other Clubs"],
  "al-nassr": ["Al Nassr", "other-clubs", "Other Clubs"],
};
// season label in the slug/name -> season field + description text
const SEASONS = { "26-27": "2026/27", "2026": "2026" };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORK = path.join(ROOT, "scripts", "catalog", "work");
const PUBLIC_DIR = path.join(ROOT, "public", "catalog");

const results = PHASE === "prune" || PHASE === "retire" ? [] : JSON.parse(fs.readFileSync(path.join(WORK, "results.json"), "utf8"))
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
    if (APPLY && !KEEP_OLD) fs.rmSync(dir, { recursive: true, force: true });
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
  for (const r of results) {
    if (teams.has(r.team) || !NEW_TEAMS[r.team]) continue;
    const [name, lslug, lname] = NEW_TEAMS[r.team];
    console.log(`  + team ${name} (${lname})`);
    if (!APPLY) { teams.set(r.team, { id: "dry", slug: r.team, name }); continue; }
    const maxOrder = (await prisma.league.aggregate({ _max: { order: true } }))._max.order ?? 0;
    const league = await prisma.league.upsert({ where: { slug: lslug }, update: {}, create: { slug: lslug, name: lname, order: maxOrder + 1 } });
    teams.set(r.team, await prisma.team.create({ data: { slug: r.team, name, leagueId: league.id }, select: { id: true, slug: true, name: true } }));
  }
  let created = 0, skipped = 0;
  for (const r of results) {
    const team = teams.get(r.team);
    if (!team) { console.log(`  ! no DB team for ${r.team}`); skipped++; continue; }
    const files = plannedFiles(r);
    const missing = files.filter((f) => !fs.existsSync(f.dest));
    if (missing.length) { console.log(`  ! ${r.slug}: run --phase files first`); skipped++; continue; }
    const urls = JSON.stringify(files.map((f) => f.url));
    const price = r.price ?? PRICE_MAD;
    const existing = await prisma.product.findUnique({ where: { slug: r.slug }, select: { id: true, images: true, price: true } });
    if (existing && existing.price !== price) {
      console.log(`  ~ ${r.slug} price ${existing.price} -> ${price} MAD`);
      if (APPLY) await prisma.product.update({ where: { id: existing.id }, data: { price } });
    }
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
    const label = r.season || "26-27";
    const season = r.season_text || SEASONS[label] || SEASON;
    const player = r.player !== false;            // stock items are fan / retro shirts
    const retro = r.category === "retro";
    const data = {
      name: `${team.name} ${label} ${kit}` + (player ? " Player Version" : retro ? " Retro" : ""),
      description: [r.brand || BRAND[r.team], team.name, season, kit,
        player ? "Jersey Player Version Men's" : retro ? "Retro Jersey Men's" : "Jersey Men's"].filter(Boolean).join(" "),
      slug: r.slug,
      price,
      images: urls,
      sizes: JSON.stringify(SIZES),
      teamId: team.id,
      category: r.category || "jersey",
      season,
      surCommande: PRE_ORDER,
    };
    console.log(`  + ${data.name.padEnd(38)} ${files.length} imgs  ${price} MAD`);
    if (APPLY) await prisma.product.create({ data });
    created++;
  }
  console.log(`${APPLY ? "Created" : "Would create"} ${created} products, skipped ${skipped}.`);
  await prisma.$disconnect();
}

if (!APPLY) console.log("DRY RUN — add --apply to write.\n");
/** Remove files in public/catalog that no product in the DB references any more. */
async function phasePrune() {
  const prisma = new PrismaClient();
  const used = new Set();
  for (const p of await prisma.product.findMany({ select: { images: true } })) {
    for (const u of JSON.parse(p.images || "[]")) if (u.startsWith("/catalog/")) used.add(u);
  }
  await prisma.$disconnect();
  let removed = 0;
  for (const dir of fs.existsSync(PUBLIC_DIR) ? fs.readdirSync(PUBLIC_DIR) : []) {
    for (const f of fs.readdirSync(path.join(PUBLIC_DIR, dir))) {
      if (used.has(`/catalog/${dir}/${f}`)) continue;
      removed++;
      if (APPLY) fs.rmSync(path.join(PUBLIC_DIR, dir, f));
    }
    if (APPLY && fs.readdirSync(path.join(PUBLIC_DIR, dir)).length === 0) fs.rmdirSync(path.join(PUBLIC_DIR, dir));
  }
  console.log(`${APPLY ? "Removed" : "Would remove"} ${removed} unreferenced files (${used.size} in use).`);
}

/** Delete products that are not in results.json (e.g. the old Wanfing catalog),
 *  after writing a JSON backup of them to work/. Refuses if any has an order. */
async function phaseRetire() {
  const prisma = new PrismaClient();
  const keep = new Set(JSON.parse(fs.readFileSync(path.join(WORK, "results.json"), "utf8")).map((r) => r.slug));
  const gone = (await prisma.product.findMany({ include: { team: { select: { slug: true } } } })).filter((p) => !keep.has(p.slug));
  const ordered = await prisma.orderItem.findMany({ where: { productId: { in: gone.map((p) => p.id) } }, select: { productId: true } }).catch(() => []);
  if (ordered.length) { console.log(`  ! ${ordered.length} order line(s) reference these products — not deleting`); await prisma.$disconnect(); return; }
  for (const p of gone) console.log(`  - ${p.slug}`);
  if (APPLY && gone.length) {
    const f = path.join(WORK, `backup-retired-products-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`);
    fs.writeFileSync(f, JSON.stringify(gone, null, 1));
    await prisma.product.deleteMany({ where: { id: { in: gone.map((p) => p.id) } } });
    console.log(`  backup: ${path.relative(ROOT, f)}`);
  }
  console.log(`${APPLY ? "Deleted" : "Would delete"} ${gone.length} products not in results.json (keeping ${keep.size}).`);
  await prisma.$disconnect();
}

await (PHASE === "db" ? phaseDb() : PHASE === "prune" ? phasePrune() : PHASE === "retire" ? phaseRetire() : phaseFiles());
