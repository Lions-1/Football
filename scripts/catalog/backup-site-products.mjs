// Full backup of every Product currently on the site (incl. base64 images),
// taken before the planned cleanup that keeps only the new catalog.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
const p = new PrismaClient();
const rows = await p.product.findMany({ include: { team: { select: { slug: true, name: true } } }, orderBy: { createdAt: "asc" } });
const out = `scripts/catalog/work/backup-site-products-${new Date().toISOString().slice(0, 10)}.json`;
fs.mkdirSync("scripts/catalog/work", { recursive: true });
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(`${rows.length} products -> ${out} (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
await p.$disconnect();
