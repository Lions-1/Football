/**
 * Reset (or create) the admin user with username + password from CLI args (or defaults).
 *   node scripts/reset-admin-password.mjs admin admin123
 */
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

const username = process.argv[2] || "admin";
const password = process.argv[3] || "admin123";

const hash = await bcryptjs.hash(password, 10);

const existing = await prisma.adminUser.findUnique({ where: { username } });
if (existing) {
  await prisma.adminUser.update({ where: { id: existing.id }, data: { password: hash } });
  console.log(`UPDATED password for admin user "${username}" (id=${existing.id})`);
} else {
  const created = await prisma.adminUser.create({ data: { username, password: hash } });
  console.log(`CREATED admin user "${username}" (id=${created.id})`);
}
console.log(`  username: ${username}`);
console.log(`  password: ${password}`);

await prisma.$disconnect();
