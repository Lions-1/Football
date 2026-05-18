// One-shot admin credential rotation. Run with: node scripts/update-admin.mjs
// Reads DATABASE_URL from .env.local (pulled from Vercel).
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

// Tiny .env loader so we don't need dotenv as a dep
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

const NEW_USERNAME = process.argv[2];
const NEW_PASSWORD = process.argv[3];
if (!NEW_USERNAME || !NEW_PASSWORD) {
  console.error("Usage: node scripts/update-admin.mjs <username> <password>");
  process.exit(1);
}

const prisma = new PrismaClient();
const hashed = await bcryptjs.hash(NEW_PASSWORD, 10);

// Delete every existing admin row, then insert the single new one.
// Sessions are signed by id so old sessions become invalid automatically.
await prisma.adminUser.deleteMany({});
const created = await prisma.adminUser.create({
  data: { username: NEW_USERNAME, password: hashed },
});

console.log(`OK — admin replaced. Username: ${created.username}`);
await prisma.$disconnect();
