import fs from "fs";
import { PrismaClient } from "@prisma/client";

// Load .env (Prisma's @prisma/client doesn't auto-load it for plain scripts).
for (const line of fs.readFileSync(".env", "utf-8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?(.+?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

async function tryPing(url, label) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  const t0 = Date.now();
  try {
    const c = await p.product.count();
    console.log(`OK   ${label}: ${c} products in ${Date.now() - t0}ms`);
  } catch (e) {
    console.log(`FAIL ${label}: ${e.code || e.message?.split("\n")[0]}`);
  } finally {
    await p.$disconnect().catch(() => {});
  }
}

await tryPing(process.env.DATABASE_URL, "DATABASE_URL  (pooler)");
await tryPing(process.env.DIRECT_URL,    "DIRECT_URL    (direct)");
