/**
 * Check if an admin user exists. Do NOT print passwords.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const admins = await prisma.adminUser.findMany({
  select: { id: true, username: true },
});
console.log(`Admin users: ${admins.length}`);
for (const a of admins) {
  console.log(`  - ${a.username}   (id=${a.id})`);
}
await prisma.$disconnect();
