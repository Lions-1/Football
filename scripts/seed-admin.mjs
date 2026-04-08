import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = "Mebutik2025!";

  const hash = await bcryptjs.hash(password, 12);

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    await prisma.adminUser.update({
      where: { username },
      data: { password: hash },
    });
    console.log(`Updated admin user "${username}" with new hashed password`);
  } else {
    await prisma.adminUser.create({
      data: { username, password: hash },
    });
    console.log(`Created admin user "${username}"`);
  }

  console.log(`\nCredentials:`);
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log(`\nLogin at: /admin/login`);

  await prisma.$disconnect();
}

main().catch(console.error);
